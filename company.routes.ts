import { Router } from "express";
import { getDb } from "../services/db";
import { authenticateToken } from "./middleware/auth.middleware";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Get the company the current user belongs to
router.get("/my-company", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const memberRes = await db.query(
      "SELECT company_id, role FROM company_members WHERE user_id = $1",
      [userId]
    );

    if (memberRes.rows.length === 0) {
      return res.json({ company: null });
    }

    const companyId = memberRes.rows[0].company_id;
    const companyRes = await db.query("SELECT * FROM companies WHERE id = $1", [companyId]);
    
    // Get verification stats or docs
    const verificationsRes = await db.query(
      "SELECT * FROM company_verifications WHERE company_id = $1 ORDER BY created_at DESC", 
      [companyId]
    );

    res.json({ 
      company: companyRes.rows[0],
      role: memberRes.rows[0].role,
      verifications: verificationsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// Email OTP Verification
router.post("/verify/email-request", authenticateToken, async (req: any, res) => {
    const userId = getUserId(req);
    const { companyId, email } = req.body;
    const db = getDb();

    try {
        // Simple security check: user must belong to company
        const memberCheck = await db.query(
            "SELECT 1 FROM company_members WHERE company_id = $1 AND user_id = $2",
            [companyId, userId]
        );
        if (memberCheck.rows.length === 0) return res.status(403).json({ error: "Unauthorized access to company" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // In a real app, send email here
        console.log(`[VERIFICATION] Sending OTP ${otp} to ${email} for company ${companyId}`);

        await db.query(`
            INSERT INTO company_verifications (company_id, document_type, document_url, status)
            VALUES ($1, 'email_otp', $2, 'pending')
        `, [companyId, otp]); // Store OTP in URL field for simplicity in this mock, or better a dedicated table

        res.json({ success: true, message: "Security code dispatched to your business email." });
    } catch (err) {
        res.status(500).json({ error: "Failed to initiate verification" });
    }
});

router.post("/verify/email-confirm", authenticateToken, async (req: any, res) => {
    const userId = getUserId(req);
    const { companyId, otp } = req.body;
    const db = getDb();

    try {
        const verifyRes = await db.query(
            "SELECT id FROM company_verifications WHERE company_id = $1 AND document_type = 'email_otp' AND document_url = $2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
            [companyId, otp]
        );

        if (verifyRes.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired security code." });
        }

        const verificationId = verifyRes.rows[0].id;

        // Mark verification as success
        await db.query(
            "UPDATE company_verifications SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = $1",
            [verificationId]
        );

        // Mark company as verified
        await db.query(
            "UPDATE companies SET verification_status = 'verified', trust_score = trust_score + 50 WHERE id = $1",
            [companyId]
        );

        res.json({ success: true, message: "Company credentials authenticated!" });
    } catch (err) {
        res.status(500).json({ error: "Verification processing failure" });
    }
});

// Create or update company profile
router.post("/profile", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const { 
    name, logo_url, banner_url, description, industry, 
    size, website, location, founded_year, social_links 
  } = req.body;
  
  const db = getDb();
  try {
    // Check if user already has a company
    const memberRes = await db.query(
      "SELECT company_id, role FROM company_members WHERE user_id = $1",
      [userId]
    );

    let companyId;
    if (memberRes.rows.length === 0) {
      // Create new company
      const newCompany = await db.query(
        `INSERT INTO companies (name, logo_url, banner_url, description, industry, size, website, location, founded_year, social_links)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [name, logo_url, banner_url, description, industry, size, website, location, founded_year, JSON.stringify(social_links || {})]
      );
      companyId = newCompany.rows[0].id;

      // Add user as owner
      await db.query(
        "INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, $3)",
        [companyId, userId, 'owner']
      );

      // Update user's company_id for quick access
      await db.query("UPDATE users SET company_id = $1, organization = $2 WHERE id = $3", [companyId, name, userId]);
    } else {
      companyId = memberRes.rows[0].company_id;
      const role = memberRes.rows[0].role;

      if (role !== 'owner' && role !== 'hr' && role !== 'manager') {
        return res.status(403).json({ error: "Insufficient permissions to edit company profile" });
      }

      await db.query(
        `UPDATE companies SET 
          name = COALESCE($1, name),
          logo_url = COALESCE($2, logo_url),
          banner_url = COALESCE($3, banner_url),
          description = COALESCE($4, description),
          industry = COALESCE($5, industry),
          size = COALESCE($6, size),
          website = COALESCE($7, website),
          location = COALESCE($8, location),
          founded_year = COALESCE($9, founded_year),
          social_links = COALESCE($10, social_links)
         WHERE id = $11`,
        [name, logo_url, banner_url, description, industry, size, website, location, founded_year, social_links ? JSON.stringify(social_links) : null, companyId]
      );
      
      // Sync organization name back to user
      if (name) {
          await db.query("UPDATE users SET organization = $1 WHERE company_id = $2", [name, companyId]);
      }
    }

    res.json({ success: true, companyId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save company profile" });
  }
});

// Get public company profile
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const companyRes = await db.query("SELECT * FROM companies WHERE id = $1", [id]);
    if (companyRes.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const activeJobs = await db.query(
      "SELECT * FROM job_posts WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC",
      [id]
    );

    res.json({
      company: companyRes.rows[0],
      jobs: activeJobs.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company profile" });
  }
});

// Team Management: Get members
router.get("/:id/members", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT m.role, m.created_at, u.id, u.name, u.email, u.profile_image_url
      FROM company_members m
      JOIN users u ON m.user_id = u.id
      WHERE m.company_id = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// Team Management: Add member
router.post("/team/add", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const { companyId, memberEmail, role } = req.body;
  const db = getDb();
  try {
    // Check if current user is owner or hr
    const adminCheck = await db.query(
      "SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2",
      [companyId, userId]
    );

    const userRole = adminCheck.rows[0]?.role;
    if (userRole !== 'owner' && userRole !== 'hr') {
      return res.status(403).json({ error: "Only owners or HR can add members" });
    }

    // Find the user by email
    const targetUser = await db.query("SELECT id FROM users WHERE email = $1", [memberEmail]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "User with this email not found" });
    }

    const memberId = targetUser.rows[0].id;

    await db.query(
      "INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role",
      [companyId, memberId, role || 'recruiter']
    );

    await db.query("UPDATE users SET company_id = $1 WHERE id = $2", [companyId, memberId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
});

// Company Verification
router.post("/verify", authenticateToken, async (req: any, res) => {
  const userId = getUserId(req);
  const { companyId, documentType, documentUrl } = req.body;
  const db = getDb();
  try {
    await db.query(
      "INSERT INTO company_verifications (company_id, document_type, document_url) VALUES ($1, $2, $3)",
      [companyId, documentType, documentUrl]
    );
    await db.query("UPDATE companies SET verification_status = 'pending' WHERE id = $1", [companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit verification" });
  }
});

export default router;
