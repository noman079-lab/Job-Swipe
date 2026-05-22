import { getDb } from "../../services/db";
import { sendSystemMessage } from "./conversation";
import nodemailer from 'nodemailer';

// Transporter logic matching email.service.ts
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

export interface InvitationParams {
  type: 'interview_request' | 'elite_proposal' | 'deployment_offer' | 'meeting_request';
  companyName: string;
  employerName: string;
  candidateName: string;
  candidateEmail?: string;
  jobRole: string;
  interviewType?: 'physical' | 'online' | 'phone';
  date?: string;
  time?: string;
  location?: string;
  meetingLink?: string;
  salaryRange?: string;
  contactNumber?: string;
  instructions?: string;
  responseDeadline?: string;
}

/**
 * Generates plain text and HTML for professional recruitment invitations
 */
export function generateInvitationContent(params: InvitationParams) {
    const {
        type,
        companyName,
        employerName,
        candidateName,
        jobRole,
        interviewType = 'online',
        date = 'To be scheduled',
        time = 'To be scheduled',
        location = 'N/A',
        meetingLink = 'N/A',
        salaryRange = 'Negotiable',
        contactNumber = '+8801XXXXXXXXX',
        instructions = 'Please review and accept or decline this offer directly on the platform.',
        responseDeadline = '48 Hours'
    } = params;

    let actionLabel = 'Interview Invitation';
    let subject = `${actionLabel} – ${jobRole} position at ${companyName}`;
    let introduction = `We are pleased to invite you for an interview regarding the ${jobRole} role at ${companyName}.`;

    if (type === 'elite_proposal') {
        actionLabel = 'Elite Proposal';
        subject = `Elite Proposal & Offer – ${jobRole} position at ${companyName}`;
        introduction = `We are thrilled to extend an Elite Proposal and job offer for the ${jobRole} role at ${companyName}. Your exceptional qualifications stood out to our hiring team!`;
    } else if (type === 'deployment_offer') {
        actionLabel = 'Deployment Offer';
        subject = `Immediate Deployment & Instant Hire – ${jobRole} at ${companyName}`;
        introduction = `You have been selected for direct instant deployment regarding the ${jobRole} role at ${companyName}. Please verify details and accept this formal assignment.`;
    } else if (type === 'meeting_request') {
        actionLabel = 'Meeting Invitation';
        subject = `Meeting Request – ${companyName}`;
        introduction = `The team at ${companyName} would like to arrange a discussion with you.`;
    }

    const typeLabel = interviewType.charAt(0).toUpperCase() + interviewType.slice(1);

    // Dynamic clean text copy
    const textPlain = `Subject: ${subject}\n\nDear ${candidateName},\n\n${introduction}\n\nEngagement Details:\n• Position/Role: ${jobRole}\n• Interview/Offer Type: ${typeLabel}\n• Scheduled Date: ${date}\n• Scheduled Time: ${time}\n• Location/Coordinates: ${interviewType === 'physical' ? location : 'N/A (Remote)'}\n• Digital Meeting Link: ${interviewType !== 'physical' ? meetingLink : 'N/A (Physical)'}\n• Offered Compensation/Salary: ${salaryRange}\n• Contact Info: ${contactNumber}\n• Response Deadline: ${responseDeadline}\n\nInstructions:\n${instructions}\n\nPlease confirm or reject the invitation through our platform dashboard.\n\nBest regards,\n${companyName} Recruitment Team\nRepresentative: ${employerName}`;

    // Recruiter-grade professional HTML template (Responsive, dark/light balanced theme)
    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F14; color: #E5E7EB; padding: 40px 30px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.2); padding: 6px 12px; border-radius: 30px; background: rgba(96, 165, 250, 0.05);">${actionLabel}</span>
            </div>
            
            <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; text-align: center; margin-top: 10px; margin-bottom: 20px; letter-spacing: -0.5px;">Invitation Received_</h1>
            
            <p style="font-size: 14px; line-height: 1.6; color: #D1D5DB; margin-bottom: 25px;">
                Dear <strong>${candidateName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #9CA3AF; margin-bottom: 25px;">
                ${introduction}
            </p>
            
            <div style="background: #111827; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; margin-bottom: 25px;">
                <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #F3F4F6; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 8px;">Engagement Specifications</h3>
                
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; width: 40%; font-weight: 500;">Role / Position</td>
                        <td style="padding: 6px 0; color: #F3F4F6; font-weight: 700;">${jobRole}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Format</td>
                        <td style="padding: 6px 0; color: #F3F4F6; font-weight: 700;">${typeLabel} Interview</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Scheduled Date</td>
                        <td style="padding: 6px 0; color: #F3F4F6; font-weight: 700;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Scheduled Time</td>
                        <td style="padding: 6px 0; color: #F3F4F6; font-weight: 700;">${time}</td>
                    </tr>
                    ${interviewType === 'physical' ? `
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Physical Address</td>
                        <td style="padding: 6px 0; color: #60A5FA; font-weight: 700;">${location}</td>
                    </tr>` : `
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Meeting Coordinates</td>
                        <td style="padding: 6px 0; color: #60A5FA; font-weight: 700; word-break: break-all;">${meetingLink}</td>
                    </tr>`}
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Offered Salary / Rate</td>
                        <td style="padding: 6px 0; color: #34D399; font-weight: 700;">${salaryRange}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Employer Contact</td>
                        <td style="padding: 6px 0; color: #F3F4F6; font-weight: 700;">${contactNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6B7280; font-weight: 500;">Response Window</td>
                        <td style="padding: 6px 0; color: #FBBF24; font-weight: 700;">${responseDeadline}</td>
                    </tr>
                </table>
            </div>

            <div style="background: rgba(255, 255, 255, 0.02); border-radius: 12px; padding: 15px; font-size: 12px; color: #9CA3AF; border-left: 3px solid #60A5FA; margin-bottom: 30px;">
                <strong>Recruiter Instructions:</strong><br/>
                ${instructions}
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
                <a href="${process.env.APP_URL || 'https://ai.studio/build'}/messages" style="display: inline-block; background: #60A5FA; color: #0B0F14; text-decoration: none; font-weight: 950; font-size: 13px; text-transform: uppercase; tracking: 1px; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(96, 165, 250, 0.3);">Respond on Portal</a>
            </div>
            
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; font-size: 11px; text-align: center; color: #4B5563;">
                Sent via professional automation from <strong>${companyName}</strong> Recruitment Command.<br/>
                Signed by <strong>${employerName}</strong>.
            </div>
        </div>
    `;

    return { subject, textPlain, html };
}

/**
 * Orchestrates the full automatic invitation flow
 */
export async function dispatchAutomatedInvitation(params: InvitationParams, conversationId: string, employerId: string, targetTableId: string) {
    const db = getDb();
    const { subject, textPlain, html } = generateInvitationContent(params);

    try {
        // Step 1: Send Direct Message inside chat (this automatically records invitation metadata matching UI components)
        // Note: The caller generally saves database entries first, then we can trigger this to enrich communications.
        
        // Step 2: Ensure recruiter / company details exist, then trigger email copy if email exists and active
        if (params.candidateEmail && params.candidateEmail.trim() !== '') {
            if (transporter) {
                try {
                    await transporter.sendMail({
                        from,
                        to: params.candidateEmail,
                        subject: subject,
                        text: textPlain,
                        html: html
                    });
                    console.log(`[AUTOMATION] Email invitation dispatched to ${params.candidateEmail}`);
                } catch (emailErr) {
                    console.error('[AUTOMATION] Email delivery failed:', emailErr);
                }
            } else {
                console.log(`[AUTOMATION] [MOCK_EMAIL] Dispatched email to ${params.candidateEmail} (no SMTP credentials configured)`);
            }
        }
        
        return { success: true };
    } catch (err) {
        console.error('[AUTOMATION] Dispatch automated invitation error:', err);
        return { success: false, error: err };
    }
}
