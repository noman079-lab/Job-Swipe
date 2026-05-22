import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Get all conversations for current user
router.get("/conversations", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        u.id as partner_id,
        u.name as partner_name,
        u.profile_image_url as partner_image,
        u.role as partner_role,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false) as unread_count
      FROM conversations c
      JOIN users u ON (c.participant1_id = u.id OR c.participant2_id = u.id) AND u.id != $1
      WHERE c.participant1_id = $1 OR c.participant2_id = $1
      ORDER BY c.last_message_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch conversations error:", err);
    console.error("Fetch Conversations Error Details:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get or create conversation with a user
router.get("/conversations/with/:userId", async (req: any, res) => {
  const partnerId = req.params.userId;
  const currentUserId = getUserId(req);
  const db = getDb();

  if (partnerId === currentUserId) return res.status(400).json({ error: "Cannot message yourself" });

  try {
    const p1 = currentUserId < partnerId ? currentUserId : partnerId;
    const p2 = currentUserId < partnerId ? partnerId : currentUserId;

    let convRes = await db.query(
      "SELECT * FROM conversations WHERE participant1_id = $1 AND participant2_id = $2",
      [p1, p2]
    );

    if (convRes.rows.length === 0) {
      convRes = await db.query(
        "INSERT INTO conversations (participant1_id, participant2_id) VALUES ($1, $2) RETURNING *",
        [p1, p2]
      );
    }

    const conversation = convRes.rows[0];
    const partnerRes = await db.query("SELECT name, profile_image_url, role FROM users WHERE id = $1", [partnerId]);
    const partner = partnerRes.rows[0];

    res.json({
      ...conversation,
      partner_name: partner?.name || "Anonymous",
      partner_image: partner?.profile_image_url,
      partner_role: partner?.role
    });
  } catch (err) {
    console.error("Fetch conversation with error:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Get total unread message count for current user
router.get("/unread-count", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT COUNT(*) 
      FROM chat_messages m 
      JOIN conversations c ON m.conversation_id = c.id 
      WHERE m.sender_id != $1 
        AND m.is_read = false 
        AND (c.participant1_id = $1 OR c.participant2_id = $1)
    `, [userId]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Fetch messages for a specific conversation
router.get("/messages/:conversationId", async (req: any, res) => {
  const { conversationId } = req.params;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const convCheck = await db.query(
      "SELECT id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)",
      [conversationId, userId]
    );
    if (convCheck.rows.length === 0) return res.status(403).json({ error: "Access denied" });

    const result = await db.query(
      "SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversationId]
    );

    await db.query(
      "UPDATE chat_messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2",
      [conversationId, userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/messages", async (req: any, res) => {
  const { receiverId, text, conversationId } = req.body;
  const senderId = getUserId(req);
  if (!text) return res.status(400).json({ error: "Message text required" });

  const db = getDb();
  try {
    let activeConversationId = conversationId;

    if (!activeConversationId && receiverId) {
      const p1 = senderId < receiverId ? senderId : receiverId;
      const p2 = senderId < receiverId ? receiverId : senderId;

      const convRes = await db.query(
        "INSERT INTO conversations (participant1_id, participant2_id, last_message) VALUES ($1, $2, $3) ON CONFLICT (participant1_id, participant2_id) DO UPDATE SET last_message = $3, last_message_at = CURRENT_TIMESTAMP RETURNING id",
        [p1, p2, text]
      );
      activeConversationId = convRes.rows[0].id;
    } else if (activeConversationId) {
      await db.query(
        "UPDATE conversations SET last_message = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2",
        [text, activeConversationId]
      );
    } else {
      return res.status(400).json({ error: "receiverId or conversationId required" });
    }

    const result = await db.query(
      "INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *",
      [activeConversationId, senderId, text]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
