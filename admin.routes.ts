import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();

// Admin: Get all pending verifications
router.get("/verifications", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT id, nid_front_url, nid_back_url, resume_url, verification_status, created_at 
      FROM users 
      WHERE (nid_front_url IS NOT NULL OR resume_url IS NOT NULL)
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Admin: Update user status
router.post("/verify-user", async (req, res) => {
  const { userId, status } = req.body;
  const db = getDb();
  try {
    await db.query("UPDATE users SET verification_status = $1 WHERE id = $2", [status, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
