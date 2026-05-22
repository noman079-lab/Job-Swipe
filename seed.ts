import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function seed() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found.");
    return;
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log("Seeding initial data...");
    
    // Ensure schema is up to date
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          role VARCHAR(20) DEFAULT 'employer' CHECK (role IN ('employer', 'worker')),
          subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro')),
          subscription_start_date TIMESTAMP,
          subscription_end_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS job_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employer_id TEXT REFERENCES users(id),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          location VARCHAR(100),
          type VARCHAR(50),
          budget VARCHAR(100),
          skills TEXT[],
          is_boosted BOOLEAN DEFAULT FALSE,
          is_urgent BOOLEAN DEFAULT FALSE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await pool.query("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS location VARCHAR(100)");
      await pool.query("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS type VARCHAR(50)");
      await pool.query("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS budget VARCHAR(100)");
      await pool.query("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS skills TEXT[]");
    } catch(e) {}

    // Create a system user
    await pool.query(`
      INSERT INTO users (id, role, subscription_plan) 
      VALUES ('system-admin', 'employer', 'pro') 
      ON CONFLICT (id) DO NOTHING
    `);

    // Add some sample jobs
    const jobs = [
      {
        title: "Senior UI Intern",
        description: "Join the fastest-growing startup in Bangladesh. We are looking for a creative university student who understands Figma and accessibility.",
        location: "Gulshan, Dhaka",
        type: "internship",
        budget: "৳15,000 - 22,000/mo",
        skills: ["Figma", "UI/UX", "Internship"]
      },
      {
        title: "Math & Physics Tutor",
        description: "Looking for an NSU/BRAC student to tutor an 8th-grade student. 3 days a week. Focus on English medium curriculum.",
        location: "Uttara, Dhaka",
        type: "part-time",
        budget: "৳8,000 - 10,000/mo",
        skills: ["Tuition", "Part-time", "O-Levels"]
      },
      {
        title: "Junior Backend Dev",
        description: "Fresh graduates welcome. Knowledge of Node.js and PostgreSQL required. Hybrid working model.",
        location: "Banani, Dhaka",
        type: "full-time",
        budget: "৳25,000 - 35,000/mo",
        skills: ["Node.js", "Backend", "Fresh Grad"]
      },
      {
        title: "React Developer for FinTech",
        description: "Seeking an experienced React developer to build modern financial dashboards. Must know Tailwind and Framer Motion.",
        location: "Dhanmondi, Dhaka",
        type: "contract",
        budget: "৳50,000/mo",
        skills: ["React", "Tailwind", "FinTech"]
      }
    ];

    for (const job of jobs) {
      await pool.query(`
        INSERT INTO job_posts (employer_id, title, description, location, type, budget, skills)
        VALUES ('system-admin', $1, $2, $3, $4, $5, $6)
      `, [job.title, job.description, job.location, job.type, job.budget, job.skills]);
    }

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await pool.end();
  }
}

seed();
