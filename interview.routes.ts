import { Router } from "express";
import { getDb } from "../services/db";
import { authenticateToken } from "./middleware/auth.middleware";
import { getOrCreateConversation, sendSystemMessage } from "./utils/conversation";
import { dispatchAutomatedInvitation } from "./utils/invitation";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

router.use(authenticateToken);

// Create an interview request
router.post("/schedule", async (req: any, res) => {
    const userId = getUserId(req);
    const { 
        talentId, jobId, title, description, 
        date, time, type, address, 
        meetingLink, notes 
    } = req.body;
    
    const db = getDb();
    try {
        const conversationId = await getOrCreateConversation(userId, talentId);

        const result = await db.query(`
            INSERT INTO interview_requests (
                employer_id, talent_id, job_id, conversation_id,
                title, description, interview_date, interview_time,
                interview_type, location_address, meeting_link, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
            RETURNING *
        `, [
            userId, talentId, jobId || null, conversationId,
            title, description, date, time,
            type || 'online', address || null, meetingLink || null, notes || null
        ]);

        const request = result.rows[0];

        const candidateRes = await db.query("SELECT name, email FROM users WHERE id = $1", [talentId]);
        const candName = candidateRes.rows[0]?.name || "Candidate";
        const candEmail = candidateRes.rows[0]?.email || "";

        const recruiterRes = await db.query("SELECT name, phone, company_name FROM users WHERE id = $1", [userId]);
        const recruiter = recruiterRes.rows[0];
        const recruiterName = recruiter?.name || "Hiring Manager";
        const contactNumber = recruiter?.phone || "+8801XXXXXXXXX";
        const companyName = recruiter?.company_name || "Verified Enterprise";

        const detailsText = `Subject: Interview Invitation – ${title}\n\n` +
            `Dear ${candName},\n\n` +
            `We are pleased to invite you for an interview regarding the ${title} role at ${companyName}.\n\n` +
            `Interview Details:\n` +
            `• Date: ${date || "to be scheduled"}\n` +
            `• Time: ${time || "to be scheduled"}\n` +
            `• Type: ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Online"} Interview\n` +
            (address ? `• Location: ${address}\n` : '') +
            (meetingLink ? `• Meeting Link: ${meetingLink}\n` : '') +
            `• Contact: ${contactNumber}\n\n` +
            `Please confirm your availability through the platform.\n\n` +
            `Best regards,\n` +
            `${companyName} Recruitment Team\n` +
            `Representative: ${recruiterName}`;

        // Send card into the chat
        await sendSystemMessage(
            conversationId,
            userId,
            detailsText,
            'interview_request',
            { 
                requestId: request.id,
                title,
                date,
                time,
                type: type || 'online',
                address,
                meetingLink,
                companyName,
                contact: contactNumber,
                status: 'pending'
            }
        );

        // Dispatches email automatically too!
        await dispatchAutomatedInvitation({
            type: 'interview_request',
            companyName,
            employerName: recruiterName,
            candidateName: candName,
            candidateEmail: candEmail,
            jobRole: title,
            interviewType: type || 'online',
            date: date || "to be scheduled",
            time: time || "to be scheduled",
            location: address,
            meetingLink: meetingLink,
            contactNumber: contactNumber,
            instructions: notes || "Please review the interview details above and confirm availability."
        }, conversationId, userId, request.id);

        res.json(request);
    } catch (err) {
        console.error("Schedule interview error:", err);
        res.status(500).json({ error: "Failed to schedule interview" });
    }
});

// Update interview request details
router.patch("/request/:id", async (req: any, res) => {
    const { id } = req.params;
    const { title, date, time, type, address, meetingLink, notes } = req.body;
    const userId = getUserId(req);
    const db = getDb();

    try {
        const requestRes = await db.query("SELECT * FROM interview_requests WHERE id = $1", [id]);
        if (requestRes.rows.length === 0) return res.status(404).json({ error: "Interview request not found" });
        
        const request = requestRes.rows[0];
        if (request.employer_id !== userId) return res.status(403).json({ error: "Only employers can update details" });

        await db.query(`
            UPDATE interview_requests 
            SET title = COALESCE($1, title),
                interview_date = COALESCE($2, interview_date),
                interview_time = COALESCE($3, interview_time),
                interview_type = COALESCE($4, interview_type),
                location_address = COALESCE($5, location_address),
                meeting_link = COALESCE($6, meeting_link),
                notes = COALESCE($7, notes),
                status = 'pending' -- Reset to pending after update
            WHERE id = $8
        `, [
            title || null, 
            date || null, 
            time || null, 
            type || null, 
            address || null, 
            meetingLink || null, 
            notes || null, 
            id
        ]);

        // Sync metadata in chat_messages
        await db.query(`
            UPDATE chat_messages 
            SET metadata = metadata || jsonb_build_object(
                'title', COALESCE($1, metadata->>'title'),
                'date', COALESCE($2, metadata->>'date'),
                'time', COALESCE($3, metadata->>'time'),
                'type', COALESCE($4, metadata->>'type'),
                'address', COALESCE($5, metadata->>'address'),
                'meetingLink', COALESCE($6, metadata->>'meetingLink'),
                'status', 'pending'
            )
            WHERE (metadata->>'requestId' = $7 OR metadata->>'interviewId' = $7)
        `, [title, date, time, type, address, meetingLink, id]);

        await sendSystemMessage(
            request.conversation_id,
            userId,
            `Interview rescheduled: ${title || request.title} for ${date || request.interview_date}`,
            'system',
            { type: 'interview_rescheduled', requestId: id }
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update interview details" });
    }
});

// Update interview request status
router.post("/request/:id/status", async (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = getUserId(req);
    const db = getDb();

    try {
        const requestRes = await db.query("SELECT * FROM interview_requests WHERE id = $1", [id]);
        if (requestRes.rows.length === 0) return res.status(404).json({ error: "Interview request not found" });
        
        const request = requestRes.rows[0];
        if (request.talent_id !== userId && request.employer_id !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await db.query("UPDATE interview_requests SET status = $1 WHERE id = $2", [status, id]);

        // Sync metadata in chat_messages so UI reflects current status
        await db.query(`
            UPDATE chat_messages 
            SET metadata = jsonb_set(metadata, '{status}', $1)
            WHERE (metadata->>'requestId' = $2 OR metadata->>'interviewId' = $2)
        `, [`"${status}"`, id]);

        // Determine notification details
        const isEmployer = userId === request.employer_id;
        const targetIcon = status === 'accepted' ? 'check' : status === 'rejected' ? 'x' : 'clock';
        const partnerId = isEmployer ? request.talent_id : request.employer_id;
        
        const userRes = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const userName = userRes.rows[0]?.name || "An Operative";

        // Send update to chat
        const statusMsg = `${userName} updated interview status to: ${status.toUpperCase()}`;
        await sendSystemMessage(
            request.conversation_id,
            userId,
            statusMsg,
            'system',
            { type: 'interview_status_update', requestId: id, status }
        );

        // Realtime Notification
        await db.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            partnerId,
            `Interview Update: ${status.toUpperCase()}_`,
            `${userName} has marked the interview protocol as ${status}. Check chat for details.`,
            'interview_update',
            `/messages/${request.conversation_id}`
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update interview status" });
    }
});

// Update interview status
router.post("/:id/status", async (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = getUserId(req);
    const db = getDb();

    try {
        const interviewRes = await db.query("SELECT * FROM interviews WHERE id = $1", [id]);
        if (interviewRes.rows.length === 0) return res.status(404).json({ error: "Interview not found" });
        
        const interview = interviewRes.rows[0];
        if (interview.talent_id !== userId && interview.employer_id !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await db.query("UPDATE interviews SET status = $1 WHERE id = $2", [status, id]);

        // Send update to chat
        const statusMsg = `Interview status updated to: ${status.toUpperCase()}`;
        await sendSystemMessage(
            interview.conversation_id,
            userId,
            statusMsg,
            'system',
            { type: 'interview_status_update', interviewId: id, status }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update interview status" });
    }
});

// Get interview details
router.get("/:id", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const db = getDb();
    try {
        const result = await db.query(`
            SELECT i.*, 
                   u_e.name as employer_name, u_e.profile_image_url as employer_image,
                   u_t.name as talent_name, u_t.profile_image_url as talent_image
            FROM interviews i
            JOIN users u_e ON i.employer_id = u_e.id
            JOIN users u_t ON i.talent_id = u_t.id
            WHERE i.id = $1 AND (i.employer_id = $2 OR i.talent_id = $2)
        `, [id, userId]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Interview not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch interview" });
    }
});

// Propose a reschedule for an interview request
router.post("/request/:id/propose-reschedule", async (req: any, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const { date, time, type, address, meetingLink, notes } = req.body;
    const db = getDb();

    try {
        const requestRes = await db.query("SELECT * FROM interview_requests WHERE id = $1", [id]);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({ error: "Interview request not found" });
        }
        const request = requestRes.rows[0];

        // Ensure user is either employer or talent
        if (request.employer_id !== userId && request.talent_id !== userId) {
            return res.status(403).json({ error: "Unauthorized to reschedule this interview" });
        }

        const isEmployer = request.employer_id === userId;
        const partnerId = isEmployer ? request.talent_id : request.employer_id;

        const proposerRes = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const proposerName = proposerRes.rows[0]?.name || "Partner";

        // Send card into the chat
        const msg = await sendSystemMessage(
            request.conversation_id,
            userId,
            `Reschedule proposal: ${proposerName} proposed a slot on ${date} at ${time}.`,
            'reschedule_proposal',
            {
                requestId: request.id,
                proposerId: userId,
                title: request.title,
                date,
                time,
                type: type || 'online',
                address: address || null,
                meetingLink: meetingLink || null,
                notes: notes || null,
                status: 'pending'
            }
        );

        // Notify the other party
        await db.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            partnerId,
            `New Reschedule Proposal_`,
            `${proposerName} has requested to reschedule your interview. Review in chat.`,
            'interview_update',
            `/messages/${request.conversation_id}`
        ]);

        res.json({ success: true, message: msg });
    } catch (err) {
        console.error("Propose reschedule error:", err);
        res.status(500).json({ error: "Failed to propose reschedule" });
    }
});

// Respond to a reschedule proposal (accept/decline)
router.post("/request/:id/respond-reschedule", async (req: any, res) => {
    const { id } = req.params; // interview request ID
    const userId = getUserId(req);
    const { messageId, action } = req.body; // action is 'accepted' or 'declined'
    const db = getDb();

    try {
        const requestRes = await db.query("SELECT * FROM interview_requests WHERE id = $1", [id]);
        if (requestRes.rows.length === 0) return res.status(404).json({ error: "Interview request not found" });
        const request = requestRes.rows[0];

        // Ensure user is authorized
        if (request.employer_id !== userId && request.talent_id !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Fetch the proposal message to verify and extract the proposed slot parameters
        const messageRes = await db.query("SELECT * FROM chat_messages WHERE id = $1", [messageId]);
        if (messageRes.rows.length === 0) return res.status(404).json({ error: "Proposal message not found" });
        const message = messageRes.rows[0];
        
        const metadata = message.metadata || {};
        if (metadata.status && metadata.status !== 'pending') {
            return res.status(400).json({ error: "Proposal has already been resolved" });
        }

        // Ensure the person accepting/declining is NOT the proposer
        if (metadata.proposerId === userId) {
            return res.status(400).json({ error: "You cannot respond to your own proposal" });
        }

        const responderRes = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const responderName = responderRes.rows[0]?.name || "Partner";

        if (action === 'accepted') {
            // 1. Update the interview_requests row with the proposed slot details
            await db.query(`
                UPDATE interview_requests 
                SET interview_date = $1,
                    interview_time = $2,
                    interview_type = $3,
                    location_address = $4,
                    meeting_link = $5,
                    notes = $6,
                    status = 'accepted'
                WHERE id = $7
            `, [
                metadata.date,
                metadata.time,
                metadata.type,
                metadata.address,
                metadata.meetingLink,
                metadata.notes,
                id
            ]);

            // Sync original interview request card metadata too, if needed, so that both cards stay fresh!
            await db.query(`
                UPDATE chat_messages 
                SET metadata = metadata || jsonb_build_object(
                    'date', $1,
                    'time', $2,
                    'type', $3,
                    'address', $4,
                    'meetingLink', $5,
                    'status', 'accepted'
                )
                WHERE (metadata->>'requestId' = $6 OR metadata->>'interviewId' = $6) AND type = 'interview_request'
            `, [metadata.date, metadata.time, metadata.type, metadata.address, metadata.meetingLink, id]);

            // 2. Mark this reschedule message status as 'accepted'
            await db.query(`
                UPDATE chat_messages
                SET metadata = jsonb_set(metadata, '{status}', '"accepted"')
                WHERE id = $1
            `, [messageId]);

            // 3. Send system message in chat
            await sendSystemMessage(
                request.conversation_id,
                userId,
                `Reschedule Proposal Accepted: Interview slot moved to ${metadata.date} at ${metadata.time}.`,
                'system',
                { type: 'interview_rescheduled', requestId: id }
            );

            // 4. Notify proposer
            await db.query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                metadata.proposerId,
                `Reschedule Accepted_`,
                `${responderName} accepted your interview reschedule proposal for ${metadata.date}.`,
                'interview_update',
                `/messages/${request.conversation_id}`
            ]);

        } else {
            // Marked as declined
            await db.query(`
                UPDATE chat_messages
                SET metadata = jsonb_set(metadata, '{status}', '"declined"')
                WHERE id = $1
            `, [messageId]);

            // Send system message in chat
            await sendSystemMessage(
                request.conversation_id,
                userId,
                `Reschedule Proposal Declined by ${responderName}.`,
                'system',
                { type: 'interview_reschedule_declined', requestId: id }
            );

            // Notify proposer
            await db.query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                metadata.proposerId,
                `Reschedule Declined_`,
                `${responderName} declined your interview reschedule proposal.`,
                'interview_update',
                `/messages/${request.conversation_id}`
            ]);
        }

        res.json({ success: true, action });
    } catch (err) {
        console.error("Respond reschedule error:", err);
        res.status(500).json({ error: "Failed to resolve reschedule proposal" });
    }
});

export default router;
