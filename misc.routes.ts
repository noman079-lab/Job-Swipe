import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Onboarding
router.post("/onboarding", async (req: any, res) => {
  const userId = getUserId(req);
  const { name, role, organization, university, is_verified } = req.body;
  const db = getDb();
  try {
    await db.query(`
      UPDATE users 
      SET name = $1, role = $2, organization = $3, university = $4, onboarding_completed = true 
      WHERE id = $5
    `, [name, role, organization, university || null, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Onboarding failed" });
  }
});

// Search Universities
router.get("/universities", async (req, res) => {
  const { query } = req.query;
  const db = getDb();
  try {
    const result = await db.query(
      "SELECT * FROM universities WHERE name ILIKE $1 OR short_name ILIKE $1 ORDER BY name ASC LIMIT 20",
      [`%${query || ''}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

// Search Companies
router.get("/companies", async (req, res) => {
    const { query } = req.query;
    const db = getDb();
    try {
      const result = await db.query(
        "SELECT * FROM companies WHERE name ILIKE $1 ORDER BY name ASC LIMIT 20",
        [`%${query || ''}%`]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
});

// Notifications
router.get("/notifications", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Notifications Error Details:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/notifications/read", async (req: any, res) => {
  const userId = getUserId(req);
  const { id } = req.body;
  const db = getDb();
  try {
    if (id) {
      await db.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [id, userId]);
    } else {
      await db.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

export default router;
