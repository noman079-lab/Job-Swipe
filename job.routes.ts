import { Router } from "express";
import { getDb } from "../services/db";
import { authenticateToken } from "./middleware/auth.middleware";
import { JOB_ROLES } from "../constants/jobRoles";
import { checkAndTriggerMutualInterest } from "./utils/mutualMatch";

const router = Router();

const getUserId = (req: any) => req.user.userId || req.user.id;

// Fetch all available job roles (Public)
router.get("/roles", (req, res) => {
    const { search } = req.query;
    if (search) {
        const filtered = JOB_ROLES.filter(r => 
            r.role.toLowerCase().includes((search as string).toLowerCase()) ||
            r.category.toLowerCase().includes((search as string).toLowerCase())
        );
        return res.json(filtered.slice(0, 50));
    }
    res.json(JOB_ROLES.slice(0, 50));
});

// Fetch jobs with optional filters (Public)
router.get("/", async (req, res) => {
  const { category, location, type, search, minSalary, maxSalary, isUrgent, skills, experienceLevel } = req.query;
  const db = getDb();
  try {
    let query = `
      SELECT j.*, u.verification_status as employer_verified, u.name as company_name 
      FROM job_posts j
      JOIN users u ON j.employer_id = u.id
      WHERE j.status = 'active'
    `;
    const values: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND $${paramCount} = ANY(j.skills)`;
      values.push(category);
      paramCount++;
    }

    if (skills) {
      const skillsArr = (skills as string).split(',').map(s => s.trim());
      query += ` AND j.skills && $${paramCount}`;
      values.push(skillsArr);
      paramCount++;
    }

    if (experienceLevel) {
      query += ` AND j.experience_level = $${paramCount}`;
      values.push(experienceLevel);
      paramCount++;
    }

    if (location) {
      query += ` AND j.location ILIKE $${paramCount}`;
      values.push(`%${location}%`);
      paramCount++;
    }

    if (type) {
      query += ` AND j.type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }

    if (search) {
      query += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    if (minSalary) {
      query += ` AND (j.min_salary >= $${paramCount} OR j.max_salary >= $${paramCount})`;
      values.push(parseInt(minSalary as string));
      paramCount++;
    }

    if (maxSalary) {
      query += ` AND (j.min_salary <= $${paramCount} OR j.max_salary <= $${paramCount})`;
      values.push(parseInt(maxSalary as string));
      paramCount++;
    }

    if (isUrgent === 'true') {
      query += ` AND j.is_urgent = true`;
    }

    query += " ORDER BY (u.verification_status = 'verified') DESC, j.created_at DESC";
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Create a new job post
router.post("/", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const { 
    title, description, category, location, type, 
    minSalary, maxSalary, hourly_rate, budget,
    skills, responsibilities, schedule, application_deadline, hires_needed,
    isUrgent, is_featured, company_id
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  const db = getDb();
  try {
    // Basic verification: user must be employer or admin, AND verified
    const userResult = await db.query("SELECT role, is_verified FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const userRecord = userResult.rows[0];
    if (userRecord.role !== 'employer' && userRecord.role !== 'admin') {
      return res.status(403).json({ error: "Only employers can launch directives." });
    }

    if (!userRecord.is_verified) {
      return res.status(403).json({ error: "Account authentication required. Please verify your email before broadcasting opportunities." });
    }

    const result = await db.query(`
      INSERT INTO job_posts (
        employer_id, company_id, title, description, category, location, type,
        min_salary, max_salary, hourly_rate, budget,
        skills, responsibilities, schedule, application_deadline, hires_needed,
        is_urgent, is_featured, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active')
      RETURNING id
    `, [
      userId, company_id || null, title, description, category || null, location || null, type || 'full-time',
      minSalary || null, maxSalary || null, hourly_rate || null, budget || null,
      skills || [], responsibilities || [], schedule || null, application_deadline || null, hires_needed || 1,
      isUrgent || false, is_featured || false
    ]);

    // Update usage count
    await db.query(`
      INSERT INTO employer_usage (employer_id, monthly_post_count)
      VALUES ($1, 1)
      ON CONFLICT (employer_id) DO UPDATE SET monthly_post_count = employer_usage.monthly_post_count + 1
    `, [userId]);

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (err) {
    console.error("Job Creation Error:", err);
    res.status(500).json({ error: "Internal operational failure during listing broadcast." });
  }
});

// Update an existing job post

// Save a job
router.post("/save", authenticateToken, async (req: any, res) => {
  const { jobId } = req.body;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const check = await db.query("SELECT * FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [userId, jobId]);
    if (check.rows.length > 0) {
      await db.query("DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2", [userId, jobId]);
      return res.json({ success: true, saved: false });
    }
    await db.query("INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)", [userId, jobId]);
    
    // Check and trigger smart mutual match
    const jobRes = await db.query("SELECT employer_id FROM job_posts WHERE id = $1", [jobId]);
    if (jobRes.rows.length > 0) {
      await checkAndTriggerMutualInterest(userId, jobRes.rows[0].employer_id);
    }

    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Apply for a job
router.post("/apply", authenticateToken, async (req: any, res) => {
  const { jobId, message } = req.body;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const check = await db.query("SELECT * FROM applications WHERE user_id = $1 AND job_id = $2", [userId, jobId]);
    if (check.rows.length > 0) return res.status(400).json({ error: "Already applied" });

    await db.query("INSERT INTO applications (user_id, job_id, message) VALUES ($1, $2, $3)", [userId, jobId, message || ""]);
    
    // Check and trigger smart mutual match
    const jobRes = await db.query("SELECT employer_id FROM job_posts WHERE id = $1", [jobId]);
    if (jobRes.rows.length > 0) {
      await checkAndTriggerMutualInterest(userId, jobRes.rows[0].employer_id);
    }

    // Grant XP
    await db.query("UPDATE users SET xp = xp + 50 WHERE id = $1", [userId]);
    
    // Achievement check (first application)
    const count = await db.query("SELECT count(*) FROM applications WHERE user_id = $1", [userId]);
    if (parseInt(count.rows[0].count) === 1) {
       await db.query("INSERT INTO user_achievements (user_id, title, type) VALUES ($1, $2, $3)", [userId, "First Mission", "emerald"]);
       await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)", [
         userId, "Level Up! +50 XP", "You've launched your first active mission. Keep pushing!", "achievement"
       ]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Like a job
router.post("/:id/like", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const check = await db.query("SELECT * FROM liked_jobs WHERE user_id = $1 AND job_id = $2", [userId, id]);
    if (check.rows.length > 0) {
      await db.query("DELETE FROM liked_jobs WHERE user_id = $1 AND job_id = $2", [userId, id]);
      return res.json({ success: true, liked: false });
    }
    await db.query("INSERT INTO liked_jobs (user_id, job_id) VALUES ($1, $2)", [userId, id]);
    
    // Check and trigger smart mutual match
    const jobRes = await db.query("SELECT employer_id FROM job_posts WHERE id = $1", [id]);
    if (jobRes.rows.length > 0) {
      await checkAndTriggerMutualInterest(userId, jobRes.rows[0].employer_id);
    }

    res.json({ success: true, liked: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Fetch applied jobs for the current user
router.get("/my-applications", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT a.*, j.title, j.location, u.name as company_name
      FROM applications a
      JOIN job_posts j ON a.job_id = j.id
      JOIN users u ON j.employer_id = u.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

export default router;
