import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Get user profile
router.get("/profile", async (req: any, res) => {
  const userId = req.query.userId || getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = result.rows[0];
    res.json({ ...user, password_hash: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile fields
router.post("/profile", async (req: any, res) => {
  const userId = getUserId(req);
  const { 
    name, university, department, location, 
    email, availability, nid, dob, emergency_contact, 
    address, bio, skills,
    company_name, company_industry, company_website, company_linkedin, recruiter_name
  } = req.body;

  const db = getDb();
  try {
    const userRes = await db.query("SELECT role, profile_image_url, nid_front_url, resume_url, profile_completion_percentage, xp, verification_status FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];

    let steps = 0;
    if (user?.profile_image_url) steps++;
    if (user?.nid_front_url || user?.nid) steps++;
    if (user?.resume_url) steps++;
    if (skills && Array.isArray(skills) && skills.length > 0) steps++;
    if (bio && bio.length > 5) steps++;

    const completion = Math.round((steps / 5) * 100);
    
    // Grant XP if profile reaches 100% for the first time
    let xpGain = 0;
    if (completion === 100 && user.profile_completion_percentage < 100) {
      xpGain = 500;
      await db.query("UPDATE users SET xp = xp + $1 WHERE id = $2", [xpGain, userId]);
      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)", [
        userId, "Achievement Unlocked!", "You've earned 500 XP for completing your profile identity.", "achievement"
      ]);
      await db.query("INSERT INTO user_achievements (user_id, title, type) VALUES ($1, $2, $3)", [
        userId, "Identity Established", "fuchsia"
      ]);
    }

    // Method 2: Validation of URL format (Simple Anti-Fake)
    let newStatus = user.verification_status;
    if (user.role === 'employer' && user.verification_status !== 'verified') {
        if ((company_website && company_website.includes('.')) || (company_linkedin && company_linkedin.includes('linkedin.com'))) {
            // If they provide a valid looking URL and aren't verified yet, we can move to 'pending' or 'verified' if they also have business email
            // For now, let's just update the status to pending if not verified
            if (user.verification_status === 'unverified') newStatus = 'pending';
        }
    }

    await db.query(`
      UPDATE users SET 
        name = $1, university = $2, department = $3, location = $4,
        email = $5, availability = $6, nid = $7, dob = $8,
        emergency_contact = $9, address = $10, bio = $11, skills = $12,
        profile_completion_percentage = $13,
        company_name = $14, company_industry = $15, company_website = $16,
        company_linkedin = $17, recruiter_name = $18,
        verification_status = $19
      WHERE id = $20
    `, [
      name, university, department, location, email, 
      availability, nid, dob, emergency_contact, 
      address, bio, skills || [], completion, 
      company_name, company_industry, company_website, 
      company_linkedin, recruiter_name, newStatus, userId
    ]);

    res.json({ success: true, message: "Profile synchronized!", completion, xpGain });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Experiences CRUD
router.get("/profile/experience", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

router.post("/profile/experience", async (req: any, res) => {
  const userId = getUserId(req);
  const { role, company, period, description } = req.body;
  const db = getDb();
  try {
    const result = await db.query(
      "INSERT INTO user_experiences (user_id, role, company, period, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, role, company, period, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to save experience" });
  }
});

router.delete("/profile/experience/:id", async (req: any, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const db = getDb();
  try {
    await db.query("DELETE FROM user_experiences WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete experience" });
  }
});

// Achievements and Progression
router.get("/achievements", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM user_achievements WHERE user_id = $1", [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Get job IDs applied by user
router.get("/applied-job-ids", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT job_id FROM applications WHERE user_id = $1", [userId]);
    res.json(result.rows.map((r: any) => r.job_id));
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Get job IDs saved by user
router.get("/saved-job-ids", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query("SELECT job_id FROM saved_jobs WHERE user_id = $1", [userId]);
    res.json(result.rows.map((r: any) => r.job_id));
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Get full details of saved jobs
router.get("/saved-jobs", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT j.*, u.name as company_name 
      FROM saved_jobs s
      JOIN job_posts j ON s.job_id = j.id
      JOIN users u ON j.employer_id = u.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

// Get hiring requests received by user
router.get("/hiring-requests", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT 
        hr.*, 
        u.name as employer_name, u.profile_image_url as employer_image,
        j.title as job_title
      FROM hiring_requests hr
      JOIN users u ON hr.employer_id = u.id
      LEFT JOIN job_posts j ON hr.job_id = j.id
      WHERE hr.talent_id = $1
      ORDER BY hr.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hiring requests" });
  }
});

// Update hiring request status (Accept/Decline)
router.post("/hiring-requests/:id/status", async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const check = await db.query("SELECT * FROM hiring_requests WHERE id = $1 AND talent_id = $2", [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Request not found" });

    await db.query("UPDATE hiring_requests SET status = $1 WHERE id = $2", [status, id]);
    
    // Notify Employer
    const talent = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
    const talentName = talent.rows[0]?.name || "A Talent";
    
    await db.query(
        "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
        [
          check.rows[0].employer_id, 
          `Request ${status}!`, 
          `${talentName} has ${status} your ${check.rows[0].type} request.`,
          "request_status",
          "/employer"
        ]
    );

    // If accepted and it's for a job, maybe create a match
    if (status === 'accepted' && check.rows[0].job_id) {
       await db.query("INSERT INTO matches (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, check.rows[0].job_id]);
    }

    res.json({ success: true, message: `Request ${status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request status" });
  }
});

export default router;
