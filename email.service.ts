import nodemailer from 'nodemailer';

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
        auth: {
            user,
            pass
        }
    });
}

export async function sendVerificationEmail(email: string, otp: string) {
    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #fff; padding: 60px 40px; border-radius: 40px; border: 1px solid #1A1A1A; text-align: center;">
            <div style="margin-bottom: 40px;">
                <div style="display: inline-block; padding: 16px; background: rgba(225, 29, 72, 0.1); border-radius: 20px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
            </div>
            <h1 style="color: #fff; margin-bottom: 12px; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; font-style: italic;">Identity Verification_</h1>
            <p style="color: #666; line-height: 1.6; margin-bottom: 40px; font-size: 15px;">Your operative access code is ready for deployment. Use the following signature to synchronize your account.</p>
            
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(225, 29, 72, 0.3); padding: 30px; border-radius: 24px; margin-bottom: 40px;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 42px; font-weight: 900; color: #e11d48; letter-spacing: 12px; text-shadow: 0 0 20px rgba(225, 29, 72, 0.3);">${otp}</span>
            </div>

            <p style="color: #444; font-size: 12px; margin-top: 40px; text-transform: uppercase; letter-spacing: 2px;">Expires in 10 minutes // Secure Protocol v4.2</p>
        </div>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from,
                to: email,
                subject: 'Action Required: Verify Your Job Swipe Intel',
                html
            });
            console.log(`[EMAIL] Verification sent to ${email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${email}:`, err);
            throw err;
        }
    } else {
        console.warn(`[EMAIL] [MOCK] No SMTP credentials. Logging OTP for ${email}:`);
        console.warn(`[EMAIL] OTP: ${otp}`);
    }
}

export async function sendResetPasswordEmail(email: string, token: string) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #fff; padding: 60px 40px; border-radius: 40px; border: 1px solid #1A1A1A; text-align: center;">
            <div style="margin-bottom: 40px;">
                <div style="display: inline-block; padding: 16px; background: rgba(110, 68, 255, 0.1); border-radius: 20px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6e44ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-2.5z"/></svg>
                </div>
            </div>
            <h1 style="color: #fff; margin-bottom: 12px; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; font-style: italic;">Access Reset Requested_</h1>
            <p style="color: #666; line-height: 1.6; margin-bottom: 40px; font-size: 15px;">A protocol override has been requested for your account. If you did not initiate this, please ignore this transmission.</p>
            
            <a href="${resetUrl}" style="background: #6e44ff; color: #fff; padding: 18px 32px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; display: inline-block; box-shadow: 0 10px 20px rgba(110, 68, 255, 0.3);">Reset Access Credentials</a>
            
            <p style="color: #444; font-size: 11px; margin-top: 40px; text-transform: uppercase; letter-spacing: 2px;">This link expires in 1 hour // Secure Protocol v4.2</p>
        </div>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from,
                to: email,
                subject: 'Security: Password Reset Directive',
                html
            });
        } catch (err) {
            console.error(`[EMAIL] Reset failed to ${email}:`, err);
        }
    } else {
        console.warn(`[EMAIL] [MOCK] Reset token for ${email}: ${token}`);
        console.warn(`[EMAIL] URL: ${resetUrl}`);
    }
}
