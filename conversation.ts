import { getDb } from "../../services/db";

export async function getOrCreateConversation(p1: string, p2: string) {
    const db = getDb();
    
    // Sort IDs to ensure uniqueness in the (participant1_id, participant2_id) unique constraint
    const u1 = p1 < p2 ? p1 : p2;
    const u2 = p1 < p2 ? p2 : p1;

    let convRes = await db.query(
        "SELECT id FROM conversations WHERE participant1_id = $1 AND participant2_id = $2",
        [u1, u2]
    );

    if (convRes.rows.length === 0) {
        convRes = await db.query(
            "INSERT INTO conversations (participant1_id, participant2_id) VALUES ($1, $2) RETURNING id",
            [u1, u2]
        );
    }

    return convRes.rows[0].id;
}

export async function sendSystemMessage(conversationId: string, senderId: string, text: string, type: string = 'system', metadata: any = {}) {
    const db = getDb();
    
    // Update last message in conversation
    await db.query(
        "UPDATE conversations SET last_message = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2",
        [text, conversationId]
    );

    // Insert message
    const res = await db.query(
        "INSERT INTO chat_messages (conversation_id, sender_id, text, type, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [conversationId, senderId, text, type, JSON.stringify(metadata)]
    );

    return res.rows[0];
}
