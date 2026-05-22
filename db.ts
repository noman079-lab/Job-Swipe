import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use lazy initialization for the DB client to avoid crashing on startup if keys are missing
let pool: any = null;

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      console.warn("DATABASE_URL not found. Using mock database mode.");
      return mockDb;
    }
    
    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      pool.on('error', (err: any) => {
        console.error('Unexpected error on idle client', err);
      });
    } catch (err) {
      console.error("Failed to initialize Postgres Pool:", err);
      return mockDb;
    }
  }
  return pool;
}

export async function initDb() {
  const db = getDb();
  if (db === mockDb) return;

  try {
    console.log("Initializing database schema...");
    
    // Ensure pgcrypto extension for gen_random_uuid()
    await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Unified schema initialization
      await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          logo_url TEXT,
          banner_url TEXT,
          description TEXT,
          industry VARCHAR(100),
          size VARCHAR(50),
          website TEXT,
          linkedin_url TEXT,
          location TEXT,
          founded_year INTEGER,
          social_links JSONB DEFAULT '{}',
          verification_status VARCHAR(20) DEFAULT 'unverified',
          trust_score INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          role VARCHAR(20) DEFAULT 'worker',
          subscription_plan VARCHAR(20) DEFAULT 'free',
          profile_image_url TEXT,
          nid_front_url TEXT,
          nid_back_url TEXT,
          resume_url TEXT,
          verification_status VARCHAR(20) DEFAULT 'unverified',
          profile_completion_percentage INTEGER DEFAULT 0,
          trust_score INTEGER DEFAULT 0,
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          name TEXT,
          full_name TEXT,
          university TEXT,
          department TEXT,
          location TEXT,
          email TEXT UNIQUE,
          phone TEXT UNIQUE,
          phone_verified BOOLEAN DEFAULT FALSE,
          otp_attempts INTEGER DEFAULT 0,
          last_otp_sent_at TIMESTAMP,
          password_hash TEXT,
          onboarding_completed BOOLEAN DEFAULT FALSE,
          is_verified BOOLEAN DEFAULT FALSE,
          company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
          company_name TEXT,
          company_industry TEXT,
          company_website TEXT,
          company_linkedin TEXT,
          recruiter_name TEXT,
          organization TEXT,
          skills TEXT[],
          unlocked_skills TEXT[],
          availability TEXT,
          nid TEXT,
          dob TEXT,
          emergency_contact TEXT,
          address TEXT,
          bio TEXT,
          subscription_start_date TIMESTAMP,
          subscription_end_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_experiences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          company TEXT NOT NULL,
          period TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          type TEXT, -- badge type
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS company_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          document_type TEXT,
          document_url TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS company_members (
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL DEFAULT 'recruiter',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (company_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS job_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(100),
          location VARCHAR(100),
          type VARCHAR(50),
          experience_level VARCHAR(50),
          budget VARCHAR(100),
          min_salary INTEGER,
          max_salary INTEGER,
          hourly_rate INTEGER,
          skills TEXT[],
          responsibilities TEXT[],
          schedule TEXT,
          application_deadline TIMESTAMP,
          hires_needed INTEGER DEFAULT 1,
          is_boosted BOOLEAN DEFAULT FALSE,
          is_urgent BOOLEAN DEFAULT FALSE,
          is_featured BOOLEAN DEFAULT FALSE,
          featured_until TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS saved_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS liked_jobs (
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS application_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
          from_status VARCHAR(20),
          to_status VARCHAR(20) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS employer_usage (
          employer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          monthly_post_count INTEGER DEFAULT 0,
          last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          plan_type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          payment_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          plan_type VARCHAR(20),
          method VARCHAR(50),
          status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS saved_talents (
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (employer_id, talent_id)
      );

      CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          participant1_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          participant2_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          last_message TEXT,
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(participant1_id, participant2_id)
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          text TEXT NOT NULL,
          type VARCHAR(20) DEFAULT 'text', -- text, interview_invite, system
          metadata JSONB DEFAULT '{}',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS interviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE SET NULL,
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          interview_date DATE NOT NULL,
          interview_time TIME NOT NULL,
          interview_type VARCHAR(20) NOT NULL, -- physical, online, phone
          location_address TEXT,
          meeting_link TEXT,
          contact_number VARCHAR(20),
          status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, rescheduled, completed
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employer_interests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(employer_id, talent_id)
      );

      CREATE TABLE IF NOT EXISTS hiring_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL, -- elite, interview, instant
          status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed
          hours INTEGER,
          total_pay DECIMAL(12, 2),
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deployments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, active, completed, cancelled
          hours INTEGER,
          total_pay DECIMAL(12, 2),
          confirmed_at TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS elite_proposals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
          custom_message TEXT,
          offered_salary DECIMAL(12, 2),
          is_urgent BOOLEAN DEFAULT FALSE,
          includes_interview BOOLEAN DEFAULT FALSE,
          status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(employer_id, talent_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS interview_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          talent_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          interview_date DATE,
          interview_time TIME,
          interview_type VARCHAR(20) NOT NULL DEFAULT 'online', -- online, phone, physical
          location_address TEXT,
          meeting_link TEXT,
          notes TEXT,
          status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, cancelled, completed
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50),
          link TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS phone_auth_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone VARCHAR(20) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS universities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          short_name VARCHAR(50),
          location TEXT,
          type VARCHAR(20), 
          logo_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Schema update safety block
    const migrations = [
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS min_salary INTEGER;",
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS max_salary INTEGER;",
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS hourly_rate INTEGER;",
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP;",
      "ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS category VARCHAR(100);",
      
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_industry TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_linkedin TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS recruiter_name TEXT;",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;",
      
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free';",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_skills TEXT[];",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);",

      // Migration for elite, deployment, and interview tables is_uuid check & job_id/conversation_id
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE;",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES job_posts(id) ON DELETE CASCADE;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;",

      // Interview Requests Table Columns Migration
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Interview Session';",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS interview_date DATE;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS interview_time TIME;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS interview_type VARCHAR(20) DEFAULT 'online';",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS location_address TEXT;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS meeting_link TEXT;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS notes TEXT;",
      "ALTER TABLE interview_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';",

      // Elite Proposals Table Columns Migration
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS custom_message TEXT;",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS offered_salary DECIMAL(12, 2);",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS includes_interview BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE elite_proposals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';",

      // Deployments Table Columns Migration
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS hours INTEGER;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS total_pay DECIMAL(12, 2);;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;",
      "ALTER TABLE deployments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;",

      // Chat Messages Table Columns Migration
      "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'text';",
      "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';",
      "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;",

      // Conversations Table Columns Migration
      "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT;",
      "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
      "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",

      // Payments Table Columns Migration
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);"
    ];

    for (const q of migrations) {
      try {
        await db.query(q);
      } catch (e) {
        console.warn(`Migration step failed: "${q}" due to:`, e);
      }
    }

    // Seed Data
    const uniCheck = await db.query("SELECT 1 FROM universities LIMIT 1");
    if (uniCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO universities (name, short_name, location, type) VALUES
        ('University of Dhaka', 'DU', 'Dhaka', 'Public'),
        ('Bangladesh University of Engineering and Technology', 'BUET', 'Dhaka', 'Public'),
        ('North South University', 'NSU', 'Dhaka', 'Private'),
        ('BRAC University', 'BRACU', 'Dhaka', 'Private'),
        ('United International University', 'UIU', 'Dhaka', 'Private');
      `);
    }

    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database schema:", err);
  }
}

// Mock database for standard environment preview without SQL configured
const mockDb = {
  query: async (text: string, params: any[]) => {
    console.log("Mock Query Executed:", text, params);
    
    // Logic to simulate basic subscription states
    if (text.includes("SELECT subscription_plan FROM users")) {
      return { rows: [{ subscription_plan: 'free' }] };
    }
    
    if (text.includes("SELECT monthly_post_count FROM employer_usage")) {
      return { rows: [{ monthly_post_count: 0 }] };
    }

    return { rows: [] };
  }
};
