import { Router } from "express";
import { getDb } from "../services/db";
import { authenticateToken } from "./middleware/auth.middleware";
import { getOrCreateConversation, sendSystemMessage } from "./utils/conversation";
import { dispatchAutomatedInvitation } from "./utils/invitation";
import { checkAndTriggerMutualInterest } from "./utils/mutualMatch";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// All employer routes should be protected
router.use(authenticateToken);

// Fetch employer dashboard stats
router.get("/dashboard", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const jobStats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM job_posts WHERE employer_id = $1 AND status = 'active') as total_posts,
        (SELECT COUNT(*) FROM applications a JOIN job_posts jp ON a.job_id = jp.id WHERE jp.employer_id = $1) as total_applicants,
        (SELECT COUNT(*) FROM matches mj JOIN job_posts jp ON mj.job_id = jp.id WHERE jp.employer_id = $1) as total_matches
    `, [userId]);

    const activeJobs = await db.query(`
      SELECT 
        j.id, j.title, 
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applicants_count,
        (SELECT COUNT(*) FROM matches WHERE job_id = j.id) as matches_count
      FROM job_posts j
      WHERE j.employer_id = $1 AND j.status = 'active'
      ORDER BY j.created_at DESC
      LIMIT 5
    `, [userId]);

    const recentChats = await db.query(`
      SELECT 
        c.id, c.last_message, c.last_message_at,
        u.name as other_user_name, u.role as other_user_role, u.university as other_user_uni, u.profile_image_url as other_user_image
      FROM conversations c
      JOIN users u ON (c.participant1_id = u.id OR c.participant2_id = u.id)
      WHERE (c.participant1_id = $1 OR c.participant2_id = $1) AND u.id != $1
      ORDER BY c.last_message_at DESC
      LIMIT 3
    `, [userId]);

    const hiringStats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM deployments WHERE employer_id = $1 AND status = 'pending') as pending_deployments,
        (SELECT COUNT(*) FROM elite_proposals WHERE employer_id = $1 AND status = 'pending') as pending_proposals,
        (SELECT COUNT(*) FROM interview_requests WHERE employer_id = $1 AND status = 'pending') as pending_interviews
    `, [userId]);

    const activeEngagements = await db.query(`
      SELECT 'deployment' as type, d.id, d.status, d.total_pay as data, u.name as partner_name, u.profile_image_url as partner_image, d.created_at, d.conversation_id
      FROM deployments d
      JOIN users u ON d.talent_id = u.id
      WHERE d.employer_id = $1 AND d.status != 'completed' AND d.status != 'cancelled'
      UNION ALL
      SELECT 'proposal' as type, ep.id, ep.status, ep.offered_salary as data, u.name as partner_name, u.profile_image_url as partner_image, ep.created_at, ep.conversation_id
      FROM elite_proposals ep
      JOIN users u ON ep.talent_id = u.id
      WHERE ep.employer_id = $1 AND ep.status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    const companyRes = await db.query(`
      SELECT c.* FROM companies c
      JOIN company_members cm ON c.id = cm.company_id
      WHERE cm.user_id = $1
      LIMIT 1
    `, [userId]);

    res.json({
      stats: { ...jobStats.rows[0], ...hiringStats.rows[0] },
      activeJobs: activeJobs.rows,
      recentChats: recentChats.rows,
      activeEngagements: activeEngagements.rows,
      company: companyRes.rows[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Check employer posting eligibility
router.get("/posting-status", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const userRes = await db.query("SELECT subscription_plan FROM users WHERE id = $1", [userId]);
    const plan = userRes.rows[0]?.subscription_plan || 'free';

    const usageRes = await db.query("SELECT monthly_post_count FROM employer_usage WHERE employer_id = $1", [userId]);
    const count = usageRes.rows[0]?.monthly_post_count || 0;

    const isPaymentEnabled = process.env.PAYMENT_ENABLED === 'true';

    let limit = 3;
    if (plan === 'basic') limit = 10;
    if (plan === 'pro') limit = 999;

    res.json({ 
      plan, 
      currentUsage: count, 
      limit, 
      isEligible: !isPaymentEnabled || count < limit 
    });
  } catch (err) {
    res.status(500).json({ plan: 'free', currentUsage: 0, limit: 3, isEligible: true }); 
  }
});

// Record a new job post
router.post("/record-job", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    await db.query(`
      INSERT INTO employer_usage (employer_id, monthly_post_count, last_reset_date)
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (employer_id) 
      DO UPDATE SET monthly_post_count = employer_usage.monthly_post_count + 1
    `, [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Notifications Helper
async function createNotification(userId: string, title: string, message: string, type: string, link?: string) {
    const db = getDb();
    await db.query(
        "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
        [userId, title, message, type, link]
    );
}

// Hire Elite (Premium Proposal)
router.post("/hire-elite", async (req: any, res) => {
    const { talentId, jobId, customMessage, salary, isUrgent, includesInterview } = req.body;
    const userId = getUserId(req);
    const db = getDb();

    // Role validation
    const user = await db.query("SELECT role, name FROM users WHERE id = $1", [userId]);
    if (!user.rows[0] || user.rows[0].role !== 'employer') {
        return res.status(403).json({ error: "Only employers can deploy elite proposals." });
    }
    const employerName = user.rows[0].name;

    try {
        const conversationId = await getOrCreateConversation(userId, talentId);
        const finalJobId = (jobId && typeof jobId === "string" && jobId.trim() !== "") ? jobId : null;

        // Fetch company profile details
        const empQuery = await db.query(`
            SELECT u.name, u.phone, u.company_name, u.company_id, c.name as c_name, c.logo_url
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1
        `, [userId]);
        const empData = empQuery.rows[0];
        const companyName = empData?.company_name || empData?.c_name || empData?.name || employerName;
        const companyLogo = empData?.logo_url || "";
        const contact = empData?.phone || "+8801XXXXXXXXX";

        let jobTitle = "Elite Candidate Engagement";
        if (finalJobId) {
            const jobRes = await db.query("SELECT title FROM job_posts WHERE id = $1", [finalJobId]);
            if (jobRes.rows.length > 0) {
                jobTitle = jobRes.rows[0].title;
            }
        }

        // Check if a pending elite proposal already exists
        const existing = await db.query(
            "SELECT id FROM elite_proposals WHERE employer_id = $1 AND talent_id = $2 AND job_id IS NOT DISTINCT FROM $3 AND status = 'pending'",
            [userId, talentId, finalJobId]
        );

        if (existing.rows.length > 0) {
            return res.json({ 
                success: true, 
                conversationId, 
                message: "A proposal is already active. Redirecting to conversation.", 
                proposalId: existing.rows[0].id 
            });
        }

        const proposal = await db.query(
            `INSERT INTO elite_proposals (
                employer_id, talent_id, job_id, conversation_id, 
                custom_message, offered_salary, is_urgent, includes_interview, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            ON CONFLICT (employer_id, talent_id, job_id) 
            DO UPDATE SET 
                custom_message = EXCLUDED.custom_message,
                offered_salary = EXCLUDED.offered_salary,
                status = 'pending',
                created_at = CURRENT_TIMESTAMP
            RETURNING id`,
            [userId, talentId, finalJobId, conversationId, customMessage, salary, isUrgent || false, includesInterview || false]
        );

        const talentQuery = await db.query("SELECT name, email FROM users WHERE id = $1", [talentId]);
        const talentName = talentQuery.rows[0]?.name || "Candidate";
        const talentEmail = talentQuery.rows[0]?.email || "";

        const detailsText = `Subject: Elite Proposal – ${jobTitle} Position\n\n` +
            `Dear ${talentName},\n\n` +
            `We are pleased to invite you for a premium engagement regarding the ${jobTitle} role at ${companyName}.\n\n` +
            `Engagement Details:\n` +
            `• Position: ${jobTitle}\n` +
            `• Offered Salary/Fixed Pay: ${salary ? '৳' + salary : "Negotiable"}\n` +
            `• Request Priority: ${isUrgent ? "HIGH PRIORITY 🚨" : "Standard"}\n` +
            `• Process Stage: ${includesInterview ? "Includes Interview Evaluation" : "Direct Hiring Offer"}\n` +
            `• Phone Contact: ${contact}\n` +
            `• Proposal Message: "${customMessage || 'No custom message.'}"\n\n` +
            `Please confirm or decline this offer through our platform interface.\n\n` +
            `Best regards,\n` +
            `${companyName} Recruitment Team\n` +
            `Representative: ${employerName}`;

        // Auto message in chat
        await sendSystemMessage(
            conversationId, 
            userId, 
            detailsText, 
            'elite_proposal', 
            { 
                proposalId: proposal.rows[0].id, 
                jobId: finalJobId, 
                salary, 
                isUrgent, 
                message: customMessage,
                companyName,
                companyLogo,
                jobTitle,
                contact,
                status: 'pending'
            }
        );

        // Professional Automatic Dispatch Flow (Notification & Email)
        await dispatchAutomatedInvitation({
            type: 'elite_proposal',
            companyName,
            employerName,
            candidateName: talentName,
            candidateEmail: talentEmail,
            jobRole: jobTitle,
            salaryRange: salary ? `৳${salary}` : "Negotiable",
            contactNumber: contact,
            instructions: customMessage || "We've sent you a premium proposal. Please check the options below to proceed."
        }, conversationId, userId, proposal.rows[0].id);

        await createNotification(
            talentId,
            "Elite Proposal Received! ⚡",
            `${companyName} has deployed a premium proposal for: ${jobTitle}. Priority check required.`,
            "elite_proposal",
            `/messages/${conversationId}`
        );

        res.json({ success: true, conversationId: conversationId, message: "Elite proposal deployed successfully" });
    } catch (err) {
        console.error("Hire Elite Error Details:", err);
        res.status(500).json({ error: "Failed to deploy elite proposal. Potentially duplicate engagement." });
    }
});

// Request Interview
router.post("/request-interview", async (req: any, res) => {
    const { 
        talentId, jobId, title, date, time, type, address, meetingLink, notes 
    } = req.body;
    const userId = getUserId(req);
    const db = getDb();

    // Role validation
    const user = await db.query("SELECT role, name FROM users WHERE id = $1", [userId]);
    if (!user.rows[0] || user.rows[0].role !== 'employer') {
        return res.status(403).json({ error: "Only employers can request interviews." });
    }
    const employerName = user.rows[0].name;

    try {
        const conversationId = await getOrCreateConversation(userId, talentId);
        const finalJobId = (jobId && typeof jobId === "string" && jobId.trim() !== "") ? jobId : null;

        // Fetch company profile details
        const empQuery = await db.query(`
            SELECT u.name, u.phone, u.company_name, u.company_id, c.name as c_name, c.logo_url
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1
        `, [userId]);
        const empData = empQuery.rows[0];
        const companyName = empData?.company_name || empData?.c_name || empData?.name || employerName;
        const companyLogo = empData?.logo_url || "";
        const contact = empData?.phone || "+8801XXXXXXXXX";

        let jobTitle = title || "Interview Session";
        if (finalJobId) {
            const jobRes = await db.query("SELECT title FROM job_posts WHERE id = $1", [finalJobId]);
            if (jobRes.rows.length > 0) {
                jobTitle = jobRes.rows[0].title;
            }
        }

        // Deduplication for interview requests - support both NULL and non-NULL job UUIDs
        const existing = await db.query(
            "SELECT id FROM interview_requests WHERE employer_id = $1 AND talent_id = $2 AND job_id IS NOT DISTINCT FROM $3 AND status = 'pending'",
            [userId, talentId, finalJobId]
        );

        if (existing.rows.length > 0) {
            return res.json({ success: true, conversationId, message: "Interview protocol already active. Redirecting to chat." });
        }

        const request = await db.query(
            `INSERT INTO interview_requests (
                employer_id, talent_id, job_id, conversation_id, 
                title, interview_date, interview_time, interview_type, 
                location_address, meeting_link, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
            RETURNING id`,
            [
                userId, 
                talentId, 
                finalJobId, 
                conversationId, 
                title || "Interview Session", 
                (date && date.trim() !== '') ? date : null, 
                (time && time.trim() !== '') ? time : null, 
                type || 'online', 
                (address && address.trim() !== '') ? address : null, 
                (meetingLink && meetingLink.trim() !== '') ? meetingLink : null, 
                (notes && notes.trim() !== '') ? notes : null
            ]
        );

        const talentQuery = await db.query("SELECT name, email FROM users WHERE id = $1", [talentId]);
        const talentName = talentQuery.rows[0]?.name || "Candidate";
        const talentEmail = talentQuery.rows[0]?.email || "";

        const detailsText = `Subject: Interview Invitation – ${jobTitle} Position\n\n` +
            `Dear ${talentName},\n\n` +
            `We are pleased to invite you for an interview regarding the ${jobTitle} role at ${companyName}.\n\n` +
            `Interview Details:\n` +
            `• Date: ${date || "to be scheduled"}\n` +
            `• Time: ${time || "to be scheduled"}\n` +
            `• Type: ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Online"} Interview\n` +
            (address ? `• Location: ${address}\n` : '') +
            (meetingLink ? `• Meeting Link: ${meetingLink}\n` : '') +
            `• Contact: ${contact}\n\n` +
            `Please confirm your availability through the platform.\n\n` +
            `Best regards,\n` +
            `${companyName} Recruitment Team\n` +
            `Representative: ${employerName}`;

        // Auto message
        await sendSystemMessage(
            conversationId, 
            userId, 
            detailsText, 
            'interview_request', 
            { 
                requestId: request.rows[0].id, 
                jobId: finalJobId, 
                title: jobTitle, 
                date: (date && date.trim() !== '') ? date : null, 
                time: (time && time.trim() !== '') ? time : null, 
                type: type || 'online', 
                address: (address && address.trim() !== '') ? address : null, 
                meetingLink: (meetingLink && meetingLink.trim() !== '') ? meetingLink : null,
                companyName,
                companyLogo,
                contact,
                notes,
                status: 'pending'
            }
        );

        // Professional Automatic Dispatch Flow (Notification & Email)
        await dispatchAutomatedInvitation({
            type: 'interview_request',
            companyName,
            employerName,
            candidateName: talentName,
            candidateEmail: talentEmail,
            jobRole: jobTitle,
            interviewType: type || 'online',
            date: date || "to be scheduled",
            time: time || "to be scheduled",
            location: address,
            meetingLink: meetingLink,
            contactNumber: contact,
            instructions: notes || "We look forward to meeting with you. Please review details above and confirm."
        }, conversationId, userId, request.rows[0].id);

        await createNotification(
            talentId,
            "New Interview Protocol_",
            `${companyName} has requested an interview for position: ${jobTitle}. Confirm availability in chat.`,
            "interview_request",
            `/messages/${conversationId}`
        );

        res.json({ success: true, conversationId, message: "Interview request synchronized." });
    } catch (err) {
        console.error("Request Interview Error Details:", err);
        res.status(500).json({ error: "Failed to request interview." });
    }
});

// Instant Hire / Deployment Protocol
router.post("/instant-hire", async (req: any, res) => {
  const { talentId, jobId, hours, totalPay } = req.body;
  const userId = getUserId(req);
  const db = getDb();

  // Role validation
  const user = await db.query("SELECT role, name FROM users WHERE id = $1", [userId]);
  if (!user.rows[0] || user.rows[0].role !== 'employer') {
    return res.status(403).json({ error: "Only employers can trigger instant deployments." });
  }
  const employerName = user.rows[0].name;

  try {
    const conversationId = await getOrCreateConversation(userId, talentId);
    const finalJobId = (jobId && typeof jobId === "string" && jobId.trim() !== "") ? jobId : null;

    // Fetch company profile details
    const empQuery = await db.query(`
        SELECT u.name, u.phone, u.company_name, u.company_id, c.name as c_name, c.logo_url
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1
    `, [userId]);
    const empData = empQuery.rows[0];
    const companyName = empData?.company_name || empData?.c_name || empData?.name || employerName;
    const companyLogo = empData?.logo_url || "";
    const contact = empData?.phone || "+8801XXXXXXXXX";

    let jobTitle = "Direct Operative Deployment";
    if (finalJobId) {
        const jobRes = await db.query("SELECT title FROM job_posts WHERE id = $1", [finalJobId]);
        if (jobRes.rows.length > 0) {
            jobTitle = jobRes.rows[0].title;
        }
    }

    // Prevent duplicate active deployments
    const existing = await db.query(
        "SELECT id FROM deployments WHERE employer_id = $1 AND talent_id = $2 AND job_id IS NOT DISTINCT FROM $3 AND status NOT IN ('completed', 'cancelled')",
        [userId, talentId, finalJobId]
    );

    if (existing.rows.length > 0) {
        return res.json({ success: true, conversationId, message: "Operative already deployed to this mission." });
    }

    const deployment = await db.query(
        `INSERT INTO deployments (
            employer_id, talent_id, job_id, conversation_id, status, hours, total_pay
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        RETURNING id`,
        [userId, talentId, finalJobId, conversationId, hours ? parseInt(hours) : null, totalPay ? parseFloat(totalPay) : null]
    );

    const talentQuery = await db.query("SELECT name, email FROM users WHERE id = $1", [talentId]);
    const talentName = talentQuery.rows[0]?.name || "Candidate";
    const talentEmail = talentQuery.rows[0]?.email || "";

    const amountStr = totalPay ? `৳${totalPay}` : 'Negotiable';
    const detailsText = `Subject: Immediate Deployment & Instant Hire – ${jobTitle}\n\n` +
      `Dear ${talentName},\n\n` +
      `You have been formally selected for immediate active deployment with ${companyName}.\n\n` +
      `Deployment Specifications:\n` +
      `• Position/Role: ${jobTitle}\n` +
      `• Offered Compensation/Fixed Pay: ${amountStr}\n` +
      `• Estimated Duration: ${hours || "TBD"} Cycles/Hours\n` +
      `• Contact: ${contact}\n\n` +
      `Upon accepting, you will be initialized on active deployment status on our team dashboard.\n\n` +
      `Best regards,\n` +
      `${companyName} Recruitment Team\n` +
      `Representative: ${employerName}`;

    // Auto message
    await sendSystemMessage(
        conversationId, 
        userId, 
        detailsText, 
        'deployment_offer', 
        { 
            deploymentId: deployment.rows[0].id, 
            jobId: finalJobId, 
            totalPay, 
            hours,
            companyName,
            companyLogo,
            jobTitle,
            contact,
            status: 'pending'
        }
    );

    // Professional Automatic Dispatch Flow (Notification & Email)
    await dispatchAutomatedInvitation({
        type: 'deployment_offer',
        companyName,
        employerName,
        candidateName: talentName,
        candidateEmail: talentEmail,
        jobRole: jobTitle,
        salaryRange: amountStr,
        contactNumber: contact,
        instructions: `Format: Instant Direct Placement. Scheduled cycles: ${hours || "TBD"}. Please accept to confirm.`
    }, conversationId, userId, deployment.rows[0].id);

    await createNotification(
        talentId,
        "Instant Deployment Request! ⚡",
        `${companyName} has initiated a direct deployment protocol for ৳${totalPay || 'Negotiable'}. Confirm to activate.`,
        "deployment_request",
        `/messages/${conversationId}`
    );
    
    res.json({ success: true, conversationId, message: "Instant deployment protocol initiated." });
  } catch (err) {
    console.error("Instant Hire Error Details:", err);
    res.status(500).json({ error: "Deployment synchronization failure." });
  }
});

// Save Candidate (Love Button Interest)
router.post("/talents/save", async (req: any, res) => {
    const { talentId } = req.body;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const check = await db.query("SELECT * FROM saved_talents WHERE employer_id = $1 AND talent_id = $2", [userId, talentId]);
        
        if (check.rows.length > 0) {
            await db.query("DELETE FROM saved_talents WHERE employer_id = $1 AND talent_id = $2", [userId, talentId]);
            return res.json({ success: true, saved: false });
        }

        await db.query(
            "INSERT INTO saved_talents (employer_id, talent_id) VALUES ($1, $2)",
            [userId, talentId]
        );

        // Fetch company profile details
        const empQuery = await db.query(`
            SELECT u.name, u.phone, u.company_name, u.company_id, c.name as c_name, c.logo_url
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1
        `, [userId]);
        const empData = empQuery.rows[0];
        const companyName = empData?.company_name || empData?.c_name || empData?.name || "A Premium Employer";
        const companyLogo = empData?.logo_url || "";
        const contact = empData?.phone || "+8801XXXXXXXXX";

        // Auto conversation for interest
        const conversationId = await getOrCreateConversation(userId, talentId);

        const detailsText = `${companyName} is highly interested in your profile!\n\n` +
            `Details:\n` +
            `- Organization: ${companyName}\n` +
            `- Classification: High-Potential Operative Bookmarking\n` +
            `- Contact: ${contact}\n\n` +
            `They have bookmarked you in their recruitment portfolio. Click "Accept Interest" or "Interested" inside chat to start communicating!`;

        await sendSystemMessage(
            conversationId, 
            userId, 
            detailsText, 
            'interest_request', 
            { 
                type: 'interest',
                companyName,
                companyLogo,
                contact,
                status: 'pending'
            }
        );

        await createNotification(
            talentId,
            "New Secret Interest! ❤️",
            `${companyName} has bookmarked your profile as a high-potential operative. Initiate link in chat!`,
            "interest",
            `/messages/${conversationId}`
        );

        // Check and trigger smart mutual interest flow
        const matchResult = await checkAndTriggerMutualInterest(talentId, userId);

        res.json({ success: true, saved: true, mutualMatch: matchResult?.matched || false });
    } catch (err) {
        res.status(500).json({ error: "Failed to process interest" });
    }
});

// Fetch Saved Candidates
router.get("/talents/saved", async (req: any, res) => {
    const userId = getUserId(req);
    const db = getDb();
    try {
        const result = await db.query(`
            SELECT u.* FROM users u
            JOIN saved_talents st ON u.id = st.talent_id
            WHERE st.employer_id = $1
            ORDER BY st.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch saved candidates" });
    }
});

// Talents
router.get("/talents", async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM users WHERE role = 'worker' ORDER BY trust_score DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// Fetch detailed applicants for a specific job
router.get("/jobs", async (req: any, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const jobs = await db.query(`
      SELECT 
        j.*, 
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
      FROM job_posts j
      WHERE j.employer_id = $1
      ORDER BY j.created_at DESC
    `, [userId]);
    res.json(jobs.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Fetch detailed applicants for a specific job
router.get("/jobs/:jobId/applicants", async (req: any, res) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  const db = getDb();
  try {
    const jobCheck = await db.query("SELECT employer_id, company_id FROM job_posts WHERE id = $1", [jobId]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ error: "Job not found" });

    const applicants = await db.query(`
      SELECT 
        a.id as application_id, a.status, a.message, a.created_at,
        u.id as user_id, u.name, u.email, u.profile_image_url, u.university, u.trust_score, u.skills
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.job_id = $1
      ORDER BY a.created_at DESC
    `, [jobId]);

    res.json(applicants.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
});

// Accept Elite Proposal
router.post("/proposals/:id/accept", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const proposalRes = await db.query("SELECT * FROM elite_proposals WHERE id = $1", [id]);
        if (proposalRes.rows.length === 0) return res.status(404).json({ error: "Proposal not found" });
        
        const proposal = proposalRes.rows[0];
        if (proposal.talent_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        await db.query("UPDATE elite_proposals SET status = 'accepted' WHERE id = $1", [id]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1::jsonb)
            WHERE metadata->>'proposalId' = $2
        `, [JSON.stringify("accepted"), id]);
        
        // Auto convert to active match or deployment if needed
        await db.query("INSERT INTO matches (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, proposal.job_id]);

        const candidate = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const candName = candidate.rows[0]?.name || "An Operative";

        await sendSystemMessage(
            proposal.conversation_id,
            userId,
            `${candName} accepted your Elite Proposal. Strategic partnership activated!`,
            'system',
            { type: 'proposal_accepted', proposalId: id }
        );

        await createNotification(
            proposal.employer_id,
            "Elite Proposal Accepted! 🚀",
            `${candName} has accepted your elite proposal. Engagement is now ACTIVE.`,
            "proposal_accepted",
            `/messages/${proposal.conversation_id}`
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Accept Proposal Failed:", err);
        res.status(500).json({ error: "Failed to accept proposal" });
    }
});

// Decline Elite Proposal
router.post("/proposals/:id/decline", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const proposalRes = await db.query("SELECT * FROM elite_proposals WHERE id = $1", [id]);
        if (proposalRes.rows.length === 0) return res.status(404).json({ error: "Proposal not found" });
        
        const proposal = proposalRes.rows[0];
        if (proposal.talent_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        await db.query("UPDATE elite_proposals SET status = 'declined' WHERE id = $1", [id]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1::jsonb)
            WHERE metadata->>'proposalId' = $2
        `, [JSON.stringify("declined"), id]);

        const candidate = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const candName = candidate.rows[0]?.name || "An Operative";

        await sendSystemMessage(
            proposal.conversation_id,
            userId,
            `${candName} declined the Elite Proposal.`,
            'system',
            { type: 'proposal_declined', proposalId: id }
        );

        await createNotification(
            proposal.employer_id,
            "Elite Proposal Declined",
            `${candName} declined your elite proposal. Check chat for alternate agreements.`,
            "proposal_declined",
            `/messages/${proposal.conversation_id}`
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Decline Proposal Failed:", err);
        res.status(500).json({ error: "Failed to decline proposal" });
    }
});

// Confirm Deployment (Candidate Confirming)
router.post("/deployments/:id/confirm", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const deploymentRes = await db.query("SELECT * FROM deployments WHERE id = $1", [id]);
        if (deploymentRes.rows.length === 0) return res.status(404).json({ error: "Deployment not found" });

        const deployment = deploymentRes.rows[0];
        if (deployment.talent_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        await db.query("UPDATE deployments SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1::jsonb)
            WHERE metadata->>'deploymentId' = $2
        `, [JSON.stringify("confirmed"), id]);

        const candidate = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const candName = candidate.rows[0]?.name || "An Operative";

        await sendSystemMessage(
            deployment.conversation_id,
            userId,
            `${candName} confirmed the deployment. Ready for active phase.`,
            'system',
            { type: 'deployment_confirmed', deploymentId: id }
        );

        await createNotification(
            deployment.employer_id,
            "Deployment Confirmed! ⚡",
            `${candName} has confirmed the instant deployment. Protocol is now LIVE.`,
            "deployment_confirmed",
            `/messages/${deployment.conversation_id}`
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Confirm Deployment Failed:", err);
        res.status(500).json({ error: "Deployment confirmation failed" });
    }
});

// Decline/Cancel Deployment (Candidate Declining)
router.post("/deployments/:id/decline", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const deploymentRes = await db.query("SELECT * FROM deployments WHERE id = $1", [id]);
        if (deploymentRes.rows.length === 0) return res.status(404).json({ error: "Deployment not found" });

        const deployment = deploymentRes.rows[0];
        if (deployment.talent_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        await db.query("UPDATE deployments SET status = 'cancelled' WHERE id = $1", [id]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1::jsonb)
            WHERE metadata->>'deploymentId' = $2
        `, [JSON.stringify("declined"), id]);

        const candidate = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const candName = candidate.rows[0]?.name || "An Operative";

        await sendSystemMessage(
            deployment.conversation_id,
            userId,
            `${candName} declined the Instant Deployment offer.`,
            'system',
            { type: 'deployment_declined', deploymentId: id }
        );

        await createNotification(
            deployment.employer_id,
            "Deployment Offer Declined",
            `${candName} declined your instant deployment offer.`,
            "deployment_declined",
            `/messages/${deployment.conversation_id}`
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Decline Deployment Failed:", err);
        res.status(500).json({ error: "Deployment decline failed" });
    }
});

// Respond to Interest Request
router.post("/interests/:conversationId/respond", async (req: any, res) => {
    const { conversationId } = req.params;
    const { status } = req.body; // 'accepted' (Interested) or 'declined'
    const userId = getUserId(req);
    const db = getDb();

    try {
        const convRes = await db.query("SELECT * FROM conversations WHERE id = $1", [conversationId]);
        if (convRes.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        const conv = convRes.rows[0];
        const employerId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;

        // update status of employer_interests if it exists, otherwise create it
        await db.query(`
            INSERT INTO employer_interests (employer_id, talent_id, status)
            VALUES ($1, $2, $3)
            ON CONFLICT (employer_id, talent_id)
            DO UPDATE SET status = $3
        `, [employerId, userId, status === "accepted" ? "accepted" : "rejected"]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1::jsonb)
            WHERE conversation_id = $2 AND type = 'interest_request'
        `, [JSON.stringify(status === "accepted" ? "accepted" : "declined"), conversationId]);

        const candidateRes = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const candName = candidateRes.rows[0]?.name || "An Operative";

        const respText = status === "accepted"
            ? `${candName} accepted your profile interest and is interested in your company. Mutual connection established!`
            : `${candName} declined the interest request.`;

        await sendSystemMessage(
            conversationId,
            userId,
            respText,
            'system',
            { type: 'interest_response', status }
        );

        await createNotification(
            employerId,
            status === "accepted" ? "Mutual Interest Established! ❤️" : "Interest Declined",
            `${candName} has marked themselves as ${status === "accepted" ? "INTERESTED" : "NOT INTERESTED"} in your company.`,
            "interest_response",
            `/messages/${conversationId}`
        );

        if (status === "accepted") {
            // Guarantee immediate smart mutual match card insertion
            await checkAndTriggerMutualInterest(userId, employerId);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Interest respond error details:", err);
        res.status(500).json({ error: "Failed to respond to interest proposal" });
    }
});

// Job Actions: Pause, Close, Delete
router.post("/jobs/:id/action", async (req: any, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const userId = getUserId(req);
  const db = getDb();
  try {
    if (action === 'delete') {
      await db.query("DELETE FROM job_posts WHERE id = $1 AND employer_id = $2", [id, userId]);
    } else {
      const status = action === 'pause' ? 'paused' : action === 'close' ? 'closed' : 'active';
      await db.query("UPDATE job_posts SET status = $1 WHERE id = $2 AND employer_id = $3", [status, id, userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Action failed" });
  }
});

// Update Application Status with History Logging
router.post("/applications/:appId/status", async (req: any, res) => {
  const { appId } = req.params;
  const { status, notes } = req.body;
  const userId = getUserId(req);
  const db = getDb();

  try {
    // 1. Fetch current application & job details to verify ownership and get current status
    const appRes = await db.query(`
      SELECT a.status as current_status, a.job_id, jp.employer_id, u.name as candidate_name
      FROM applications a
      JOIN job_posts jp ON a.job_id = jp.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [appId]);

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    const { current_status, job_id, employer_id } = appRes.rows[0];

    // 2. Enforce ownership/authorization
    if (employer_id !== userId) {
      return res.status(403).json({ error: "Unauthorized access: You are not the employer of this listing." });
    }

    // 3. Update the status in applications table
    await db.query(`
      UPDATE applications 
      SET status = $1 
      WHERE id = $2
    `, [status, appId]);

    // 4. Log the state transition in application_history
    const historyNotes = notes || `Status updated from ${current_status} to ${status}`;
    await db.query(`
      INSERT INTO application_history (application_id, from_status, to_status, notes)
      VALUES ($1, $2, $3, $4)
    `, [appId, current_status, status, historyNotes]);

    res.json({ success: true, message: "Candidate status updated successfully." });
  } catch (err) {
    console.error("Error updating application status:", err);
    res.status(500).json({ error: "Failed to update candidate status." });
  }
});

// Fetch full history of application status changes for a specific job
router.get("/jobs/:jobId/application-history", async (req: any, res) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  const db = getDb();

  try {
    // 1. Verify job ownership
    const jobCheck = await db.query("SELECT employer_id FROM job_posts WHERE id = $1", [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job listing not found." });
    }

    if (jobCheck.rows[0].employer_id !== userId) {
      return res.status(403).json({ error: "Unauthorized: You do not own this job listing." });
    }

    // 2. Fetch all status changes log for this job's applications
    const historyResult = await db.query(`
      SELECT 
        ah.id as history_id,
        ah.application_id,
        ah.from_status,
        ah.to_status,
        ah.notes,
        ah.created_at,
        u.name as candidate_name,
        u.profile_image_url as candidate_image
      FROM application_history ah
      JOIN applications a ON ah.application_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE a.job_id = $1
      ORDER BY ah.created_at DESC
    `, [jobId]);

    res.json(historyResult.rows);
  } catch (err) {
    console.error("Error fetching application history:", err);
    res.status(500).json({ error: "Failed to fetch application history logs." });
  }
});

export default router;
