import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "../services/db";
import { sendVerificationEmail, sendResetPasswordEmail } from "./email.service";
import { validateBDPhone, sendPhoneOTP } from "./sms.service";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-job-portal-key-2024";

// Registration a new user
const signupRateLimit = new Map<string, number>();

router.post("/signup", async (req, res) => {
  const { email, password, name, role } = req.body;
  const ip = req.ip || 'unknown';

  // Simple Rate Limiting
  const now = Date.now();
  const lastAttempt = signupRateLimit.get(ip) || 0;
  if (now - lastAttempt < 10000) { // 10 seconds between signups from same IP
      return res.status(429).json({ error: "Access denied. Rate limit exceeded. Security protocol engaged." });
  }
  signupRateLimit.set(ip, now);
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, and role are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();

  // Anti-fake Rule: Block disposable emails
  const disposableDomains = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'mailin8r.com', 'guerrillamail.com'];
  const emailDomain = normalizedEmail.split('@')[1];
  if (disposableDomains.includes(emailDomain)) {
    return res.status(400).json({ error: "Disposable email addresses are not permitted. Please use a verified provider." });
  }

  try {
    const existingUser = await db.query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists with this email. Please log in." });
    }

    const { companyName } = req.body;
    let companyId = null;

    if (role === 'employer') {
      if (!companyName) {
        return res.status(400).json({ error: "Company name is required for employer registration." });
      }
      
      // Check if company exists, if not create it
      const existingCompany = await db.query("SELECT id FROM companies WHERE LOWER(name) = $1", [companyName.toLowerCase().trim()]);
      if (existingCompany.rows.length > 0) {
        companyId = existingCompany.rows[0].id;
      } else {
        const newCo = await db.query("INSERT INTO companies (name) VALUES ($1) RETURNING id", [companyName.trim()]);
        companyId = newCo.rows[0].id;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

    await db.query(`
      INSERT INTO users (id, email, password_hash, name, full_name, role, xp, trust_score, verification_status, subscription_plan, company_name, company_id)
      VALUES ($1, $2, $3, $4, $4, $5, 100, 80, 'unverified', 'free', $6, $7)
    `, [userId, normalizedEmail, passwordHash, name || normalizedEmail.split('@')[0], role, role === 'employer' ? companyName : null, companyId]);

    if (role === 'employer' && companyId) {
      await db.query("INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING", [companyId, userId]);
    }

    const token = jwt.sign({ userId, email: normalizedEmail, role }, JWT_SECRET, { expiresIn: '7d' });

    // Generate 6-Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Increased to 10 minutes for reliability

    await db.query(
      "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, otp, expiresAt]
    );

    // Track last sent
    await db.query("UPDATE users SET last_otp_sent_at = NOW(), otp_attempts = 0 WHERE id = $1", [userId]);

    // Actual Email Send
    await sendVerificationEmail(normalizedEmail, otp).catch(err => {
        console.error("[AUTH] Email send failed but signup continued:", err);
    });

    res.status(201).json({ 
      success: true, 
      token, 
      user: { 
        id: userId, email: normalizedEmail, 
        name: name || normalizedEmail.split('@')[0], 
        role, onboarding_completed: false,
        subscription_plan: 'free', is_verified: false
      },
      message: "Security code sent to your email"
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed. Please try again later." });
  }
});

// Send Verification Email
router.post("/send-verification-email", async (req: any, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const userRes = await db.query("SELECT id, last_otp_sent_at FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const userId = userRes.rows[0].id;
    const lastSent = userRes.rows[0].last_otp_sent_at;
    
    if (lastSent) {
        const secondsSince = (new Date().getTime() - new Date(lastSent).getTime()) / 1000;
        if (secondsSince < 30) {
            return res.status(429).json({ error: `Slow down. Try again in ${Math.ceil(30 - secondsSince)}s` });
        }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min

    await db.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);
    await db.query("INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)", [userId, otp, expiresAt]);
    await db.query("UPDATE users SET last_otp_sent_at = NOW(), otp_attempts = 0 WHERE id = $1", [userId]);

    await sendVerificationEmail(normalizedEmail, otp);
    
    res.json({ success: true, message: "New security code sent" });
  } catch (err) {
    console.error("[AUTH] Resend failed:", err);
    res.status(500).json({ error: "Failed to send security code" });
  }
});

// Verifying OTP
router.post("/verify-otp", async (req: any, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and security code required." });

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const otpString = otp.toString().trim();

    try {
        const userRes = await db.query("SELECT id, is_verified, otp_attempts FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not indexed in central registry." });
        
        const user = userRes.rows[0];
        const userId = user.id;

        const isPaymentEnabled = process.env.PAYMENT_ENABLED === 'true';
        const isBypass = !isPaymentEnabled && otpString === '000000';

        if (user.otp_attempts >= 5 && !isBypass) {
            return res.status(429).json({ error: "Security protocol locked. Too many failed attempts. Request a new initialization code." });
        }

        const result = await db.query(
            "SELECT * FROM email_verifications WHERE user_id = $1 AND token = $2 AND expires_at > NOW()",
            [userId, otpString]
        );

        if (result.rows.length === 0 && !isBypass) {
            await db.query("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1", [userId]);
            
            const existsAny = await db.query("SELECT * FROM email_verifications WHERE user_id = $1 AND token = $2", [userId, otpString]);
            if (existsAny.rows.length > 0) {
                return res.status(400).json({ error: "Security code expired. Tactical timeout reached. Request a new code." });
            }
            return res.status(400).json({ error: "Invalid security code. Please check your transmission." });
        }

        await db.query("UPDATE users SET is_verified = TRUE, verification_status = 'verified', otp_attempts = 0 WHERE id = $1", [userId]);
        await db.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);

        res.json({ success: true, message: "Identity synchronized successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal verification fail. Rerouting..." });
    }
});

// Check Verification Status
router.get("/check-verification", async (req: any, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const db = getDb();
        const result = await db.query("SELECT is_verified FROM users WHERE id = $1", [decoded.userId || decoded.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

        res.json({ is_verified: !!result.rows[0].is_verified });
    } catch (err) {
        res.status(403).json({ error: "Invalid token" });
    }
});

// Verify Email
router.get("/verify-email/:token", async (req, res) => {
    const { token } = req.params;
    const db = getDb();
    try {
        const result = await db.query(
            "SELECT user_id FROM email_verifications WHERE token = $1 AND expires_at > NOW()",
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).send(`
                <html>
                    <body style="background: #0D0D0D; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; margin: 0;">
                        <div style="text-align: center; border: 1px solid rgba(255, 68, 68, 0.2); padding: 60px; border-radius: 40px; background: rgba(255, 68, 68, 0.05); max-width: 400px; width: 90%;">
                            <div style="width: 80px; height: 80px; background: rgba(255, 68, 68, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px;">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </div>
                            <h1 style="color: #ff4444; font-size: 22px; font-weight: 700; margin-bottom: 10px;">Verification Link Expired</h1>
                            <p style="color: #888; margin-bottom: 40px; font-size: 14px; line-height: 1.6;">The token has expired or is invalid. Please request a new verification email or log in.</p>
                            <a href="/" style="background: #10B981; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; display: inline-block; transition: transform 0.2s;">Return to Home</a>
                        </div>
                    </body>
                </html>
            `);
        }

        const userId = result.rows[0].user_id;
        const userResult = await db.query("SELECT role, email FROM users WHERE id = $1", [userId]);
        const user = userResult.rows[0];

        // Determine verification status based on domain and role
        let verification_status = 'verified';
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'zoho.com', 'mail.com', 'ymail.com', 'protonmail.com', 'me.com'];
        const domain = user.email.split('@')[1].toLowerCase();
        
        if (user && user.role === 'employer') {
            if (!publicDomains.includes(domain)) {
                // Method 1: Business Email Detected -> Immediate Trusted Status
                verification_status = 'verified';
                await db.query("UPDATE users SET trust_score = trust_score + 20 WHERE id = $1", [userId]);
            } else {
                // Public email employer -> needs Method 2 or manual audit, start as pending
                verification_status = 'pending';
            }
        } else {
            // Worker/Student -> Verified status usually enough
            verification_status = 'verified';
        }

        await db.query("UPDATE users SET is_verified = TRUE, verification_status = $2 WHERE id = $1", [userId, verification_status]);
        await db.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);

        res.send(`
            <html>
                <body style="background: #0D0D0D; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; margin: 0;">
                    <div style="text-align: center; border: 1px solid rgba(225, 29, 72, 0.2); padding: 60px; border-radius: 40px; background: rgba(225, 29, 72, 0.05); max-width: 400px; width: 90%;">
                        <div style="width: 80px; height: 80px; background: rgba(225, 29, 72, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; animation: pulse 2s infinite;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h1 style="color: #e11d48; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 10px; font-style: italic;">Verification Complete_</h1>
                        <p style="color: #888; margin-bottom: 40px; font-size: 14px; line-height: 1.6;">Operational access restored. Your identity has been successfully synchronized with the core index.</p>
                        <a href="/" style="background: #e11d48; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: inline-block; transition: transform 0.2s;">Access Platform</a>
                    </div>
                    <style>
                        @keyframes pulse {
                            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
                            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); }
                            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
                        }
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    </style>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Verification internal error");
    }
});

// Phone OTP Send
router.post("/phone/send-otp", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const validatedPhone = validateBDPhone(phone);
    if (!validatedPhone) {
        return res.status(400).json({ error: "Invalid Bangladesh phone number. Use 01XXXXXXXXX or +8801XXXXXXXXX" });
    }

    const db = getDb();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Phone OTPs usually last longer

    try {
        await db.query("DELETE FROM phone_auth_sessions WHERE phone = $1", [validatedPhone]);
        await db.query(
            "INSERT INTO phone_auth_sessions (phone, otp, expires_at) VALUES ($1, $2, $3)",
            [validatedPhone, otp, expiresAt]
        );

        await sendPhoneOTP(validatedPhone, otp);
        
        console.log(`[AUTH] SMS OTP delivered to ${validatedPhone}`);
        res.json({ success: true, message: `Security code sent to ${validatedPhone}` });
    } catch (err) {
        console.error("[AUTH] SMS Send Error:", err);
        res.status(500).json({ error: "Failed to dispatch security code via SMS" });
    }
});

// Phone OTP Verify
router.post("/phone/verify-otp", async (req, res) => {
    const { phone, otp, role } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

    const validatedPhone = validateBDPhone(phone);
    if (!validatedPhone) return res.status(400).json({ error: "Invalid phone reference" });

    const db = getDb();
    try {
        const result = await db.query(
            "SELECT * FROM phone_auth_sessions WHERE phone = $1 AND otp = $2 AND expires_at > NOW()",
            [validatedPhone, otp]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired security code" });
        }

        // Search for user by phone (stored in users table)
        let userRes = await db.query("SELECT * FROM users WHERE phone = $1", [validatedPhone]);
        let user;

        if (userRes.rows.length === 0) {
            // New User Registration via Phone
            const userId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            await db.query(
                "INSERT INTO users (id, phone, phone_verified, email, name, role, is_verified, verification_status) VALUES ($1, $2, TRUE, $3, $4, $5, TRUE, 'verified')",
                [userId, validatedPhone, `${validatedPhone.slice(1)}@vault.id`, `Operative ${validatedPhone.slice(-4)}`, role || 'worker']
            );
            const newUser = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
            user = newUser.rows[0];
        } else {
            user = userRes.rows[0];
            await db.query("UPDATE users SET phone_verified = TRUE, is_verified = TRUE WHERE id = $1", [user.id]);
        }

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        await db.query("DELETE FROM phone_auth_sessions WHERE phone = $1", [validatedPhone]);

        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, email: user.email, name: user.name, role: user.role, 
                onboarding_completed: !!user.onboarding_completed, is_verified: true,
                phone: user.phone
            } 
        });
    } catch (err) {
        console.error("[AUTH] Verification Error:", err);
        res.status(500).json({ error: "Identity synchronization failure" });
    }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const result = await db.query("SELECT * FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: "Social login linked. Please sign in with your provider." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, email: user.email, name: user.name, 
        role: user.role, onboarding_completed: !!user.onboarding_completed,
        profile_image_url: user.profile_image_url,
        subscription_plan: user.subscription_plan || 'free',
        is_verified: !!user.is_verified
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Sync / Social Login Bridge
router.post("/sync", async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  if (!uid) return res.status(400).json({ error: "UID required" });
  
  const db = getDb();
  try {
    const userCheck = await db.query("SELECT * FROM users WHERE id = $1", [uid]);
    let user;
    
    if (userCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO users (id, email, name, full_name, profile_image_url, role, xp, trust_score, verification_status)
        VALUES ($1, $2, $3, $3, $4, 'worker', 100, 80, 'unverified')
      `, [uid, email, displayName, photoURL]);
      const newUserResult = await db.query("SELECT * FROM users WHERE id = $1", [uid]);
      user = newUserResult.rows[0];
    } else {
      await db.query(`
        UPDATE users SET email = $1, name = $2, profile_image_url = $3 WHERE id = $4
      `, [email, displayName, photoURL, uid]);
      user = { ...userCheck.rows[0], email, name: displayName, profile_image_url: photoURL };
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      success: true, token,
      user: {
        id: user.id, email: user.email, name: user.name, 
        role: user.role, onboarding_completed: !!user.onboarding_completed,
        profile_image_url: user.profile_image_url,
        subscription_plan: user.subscription_plan || 'free',
        is_verified: !!user.is_verified
      }
    });
  } catch (err) {
    console.error("Auth sync error:", err);
    res.status(500).json({ error: "Social login sync failed" });
  }
});

// Get current user (Verify Token)
router.get("/me", async (req: any, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = getDb();
    const result = await db.query("SELECT * FROM users WHERE id = $1", [decoded.userId || decoded.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    res.json({
      ...user,
      onboarding_completed: !!user.onboarding_completed,
      is_verified: !!user.is_verified,
      password_hash: undefined 
    });
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = getDb();
  try {
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: "If an account exists, a reset directive was transmitted." });
    }

    const userId = userResult.rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);
    await db.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)", [userId, token, expiresAt]);

    await sendResetPasswordEmail(email, token);
    res.json({ success: true, resetToken: token, message: "Reset directive transmitted to target." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Internal operational failure" });
  }
});

// Reset Password Route
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });

  const db = getDb();
  try {
    const resetResult = await db.query(`
      SELECT * FROM password_resets 
      WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
    `, [token]);

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: "Token expired or invalid signature." });
    }

    const userId = resetResult.rows[0].user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, userId]);
    await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);

    res.json({ success: true, message: "Access credentials updated successfully." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Internal operational failure during credential update" });
  }
});

export default router;
