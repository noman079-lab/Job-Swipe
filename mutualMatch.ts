import { getDb } from "../../services/db";
import { getOrCreateConversation, sendSystemMessage } from "./conversation";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

// Initialize transporter just in case we want to email summaries
const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT || '587');
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || '"Job Swipe" <no-reply@jobswipe.com>';

let transporter: nodemailer.Transporter | null = null;
if (host && user && pass) {
    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

/**
 * Checks if a mutual interest exists between the candidate (talentId) and the employer (employerId).
 * If yes, is triggers the SMART MUTUAL MATCH flow:
 * 1. Automatically unlocks/creates direct messaging conversation.
 * 2. Emits a professional matching announcement card inside chat.
 * 3. Highlights the discussion and dispatches realtime notifications to both parties.
 */
export async function checkAndTriggerMutualInterest(talentId: string, employerId: string) {
    const db = getDb();
    try {
        console.log(`[MUTUAL MATCH CHECKS] Verifying links between talent:${talentId} and employer:${employerId}`);

        // A. Verify Employer Interest Signals:
        // 1. Saved/Bookmarked
        const isSavedTalent = await db.query(
            "SELECT 1 FROM saved_talents WHERE employer_id = $1 AND talent_id = $2",
            [employerId, talentId]
        );
        // 2. Sent elite proposal
        const hasProposal = await db.query(
            "SELECT 1 FROM elite_proposals WHERE employer_id = $1 AND talent_id = $2 AND status = 'pending'",
            [employerId, talentId]
        );
        // 3. Sent interview request
        const hasInterview = await db.query(
            "SELECT 1 FROM interview_requests WHERE employer_id = $1 AND talent_id = $2 AND status = 'pending'",
            [employerId, talentId]
        );
        
        const employerIsInterested = (isSavedTalent.rows.length > 0) || (hasProposal.rows.length > 0) || (hasInterview.rows.length > 0);

        // B. Verify Candidate Interest Signals (related to ANY active job belonging to this employer):
        // Retrieve jobs that belong to this employer
        const employerJobs = await db.query(
            "SELECT id, title, skills FROM job_posts WHERE employer_id = $1 AND status = 'active'",
            [employerId]
        );
        
        if (employerJobs.rows.length === 0) {
            console.log("[MUTUAL MATCH CHECKS] Employer has no active jobs. Bypassing check.");
            return { matched: false };
        }

        const jobIds = employerJobs.rows.map((j: any) => j.id);

        // 1. Candidate Applied to any of the employer's jobs
        const hasApplied = await db.query(
            "SELECT job_id FROM applications WHERE user_id = $1 AND job_id = ANY($2::uuid[])",
            [talentId, jobIds]
        );
        // 2. Candidate Saved any of the employer's jobs
        const hasSavedJob = await db.query(
            "SELECT job_id FROM saved_jobs WHERE user_id = $1 AND job_id = ANY($2::uuid[])",
            [talentId, jobIds]
        );
        // 3. Candidate Liked any of the employer's jobs
        const hasLikedJob = await db.query(
            "SELECT job_id FROM liked_jobs WHERE user_id = $1 AND job_id = ANY($2::uuid[])",
            [talentId, jobIds]
        );

        const candidateIsInterested = (hasApplied.rows.length > 0) || (hasSavedJob.rows.length > 0) || (hasLikedJob.rows.length > 0);

        console.log(`[MUTUAL MATCH CHECKS] results: employerInterested=${employerIsInterested}, candidateInterested=${candidateIsInterested}`);

        if (employerIsInterested && candidateIsInterested) {
            // Trigger matching setup!
            // First: check if a mutual matching card has already been created for them so we prevent duplicate sends
            const conversationId = await getOrCreateConversation(employerId, talentId);
            
            const dupCheck = await db.query(
                "SELECT id FROM chat_messages WHERE conversation_id = $1 AND type = 'mutual_engagement'",
                [conversationId]
            );

            if (dupCheck.rows.length > 0) {
                console.log("[MUTUAL MATCH CHECKS] Mutual engagement was already triggered for this connection. Skipping duplicate send.");
                return { matched: true, alreadyCreated: true, conversationId };
            }

            // Fetch user profile data to build custom icebreaker card
            const talentQuery = await db.query("SELECT name, email, skills FROM users WHERE id = $1", [talentId]);
            const employerQuery = await db.query("SELECT company_name, name, email FROM users WHERE id = $1", [employerId]);

            const candidateName = talentQuery.rows[0]?.name || "Ahmed Hasan";
            const candidateEmail = talentQuery.rows[0]?.email || "";
            const candidateSkills = talentQuery.rows[0]?.skills || [];
            
            const companyName = employerQuery.rows[0]?.company_name || "Enterprise Recruiter";
            const employerName = employerQuery.rows[0]?.name || "Hiring Lead";
            const employerEmail = employerQuery.rows[0]?.email || "";

            // Primary Match Job Details: Use the job they interacted with most or first
            const matchedJobId = hasApplied.rows[0]?.job_id || hasSavedJob.rows[0]?.job_id || hasLikedJob.rows[0]?.job_id || jobIds[0];
            const activeJob = employerJobs.rows.find((j: any) => j.id === matchedJobId);
            const matchedJobTitle = activeJob?.title || "Technical Associate";
            const matchedJobSkills = activeJob?.skills || [];

            // Compute smart icebreakers / openers (Generates recruiter-grade conversation triggers)
            let aiIcebreaker = `You both matched for the **${matchedJobTitle}** role! Let's schedule a virtual meeting to explore code experience.`;
            const hasCommonSkills = candidateSkills.filter((s: string) => matchedJobSkills.includes(s));
            if (hasCommonSkills.length > 0) {
                aiIcebreaker = `Both parties show deep interest in **${matchedJobTitle}**. Ahmed's expertise in **${hasCommonSkills.slice(0, 3).join(", ")}** represents a perfect synergy!`;
            }

            // Prompt professional recommendation triggers
            const prompts = [
                "Schedule a formal discussion",
                "Discuss salary expectations",
                "Share technical portfolio",
                "Review candidate resume details"
            ];

            // Insert matching card into the dialogue thread
            await sendSystemMessage(
                conversationId,
                employerId, // Sent on behalf of system
                `🎉 Mutual Interest Detected! ${companyName} and ${candidateName} are both interested in linking up for the ${matchedJobTitle} position.`,
                'mutual_engagement',
                {
                    type: 'mutual_match',
                    companyName,
                    candidateName,
                    jobTitle: matchedJobTitle,
                    icebreaker: aiIcebreaker,
                    prompts,
                    conversationId,
                    status: 'established'
                }
            );

            // Dispatch Realtime Platform Notifications
            await db.query(
                "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
                [
                    talentId,
                    "Mutual Interest Confirmed! 🎉",
                    `You and ${companyName} are a perfect match. Direct message unlocked!`,
                    "mutual_match",
                    `/messages/${conversationId}`
                ]
            );

            await db.query(
                "INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)",
                [
                    employerId,
                    "Mutual Interest Confirmed! 🎉",
                    `Candidate ${candidateName} is highly interested in your ${matchedJobTitle} listing. Contact unlocked!`,
                    "mutual_match",
                    `/messages/${conversationId}`
                ]
            );

            // Optional Dynamic Email integration
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F14; color: #E5E7EB; padding: 40px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #34D399; text-transform: uppercase;">MUTUAL MATCH DETECTED</span>
                    </div>
                    <h1 style="color: #FFFFFF; font-size: 22px; text-align: center; margin-bottom: 24px;">Connection Unlocked! 🤝</h1>
                    <p style="font-size: 14px; line-height: 1.6; color: #D1D5DB;">
                        Dear <strong>${candidateName}</strong>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #9CA3AF;">
                        Great news! Both you and the recruitment command at <strong>${companyName}</strong> have expressed mutual interest regarding the <strong>${matchedJobTitle}</strong> position.
                    </p>
                    <div style="background: #111827; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin: 25px 0;">
                        <span style="font-size: 10px; color: #34D399; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">AI MATCH INSIGHTS:</span>
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #E5E7EB; font-style: italic;">"${aiIcebreaker}"</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.APP_URL || 'https://ai.studio/build'}/messages/${conversationId}" style="display: inline-block; background: #34D399; color: #0B0F14; text-decoration: none; font-weight: bold; font-size: 13px; padding: 14px 28px; border-radius: 10px; text-transform: uppercase;">Open Message Thread</a>
                    </div>
                </div>
            `;

            if (candidateEmail && transporter) {
                try {
                    await transporter.sendMail({
                        from,
                        to: candidateEmail,
                        subject: `Mutual Connection Unlocked with ${companyName}!`,
                        html: emailHtml
                    });
                } catch (err) {
                    console.error("[MUTUAL MATCH] Candidate match email dispatch failed:", err);
                }
            }

            return { matched: true, conversationId };
        }

        return { matched: false };
    } catch (err) {
        console.error("[MUTUAL MATCH ERROR]:", err);
        return { matched: false, error: err };
    }
}
