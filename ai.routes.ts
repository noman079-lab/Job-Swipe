import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
};

// AI Match Score
router.get("/match-score", async (req: any, res) => {
  const { jobId } = req.query;
  const userId = getUserId(req);
  const aiClient = getAI();
  if (!aiClient) return res.status(503).json({ error: "AI not configured" });

  const db = getDb();
  try {
    const [jobRes, userRes] = await Promise.all([
      db.query("SELECT * FROM job_posts WHERE id = $1", [jobId]),
      db.query("SELECT * FROM users WHERE id = $1", [userId])
    ]);

    if (!jobRes.rows[0] || !userRes.rows[0]) return res.status(404).json({ error: "Not found" });

    const job = jobRes.rows[0];
    const user = userRes.rows[0];

    const prompt = `Analyze match between ${user.name} and ${job.title}. User skills: ${user.skills}. Job details: ${job.description}.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "summary"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failure" });
  }
});

// AI Recommendations
router.get("/recommendations", async (req: any, res) => {
  const userId = getUserId(req);
  const aiClient = getAI();
  if (!aiClient) return res.status(503).json({ error: "AI not configured" });

  const db = getDb();
  try {
    const [userRes, jobsRes] = await Promise.all([
      db.query("SELECT * FROM users WHERE id = $1", [userId]),
      db.query("SELECT * FROM job_posts WHERE status = 'active' ORDER BY created_at DESC LIMIT 20")
    ]);

    if (!userRes.rows[0]) return res.status(404).json({ error: "User not found" });
    const user = userRes.rows[0];
    const jobs = jobsRes.rows;

    const prompt = `Recommend 3 jobs for user with skills: ${user.skills}. Jobs list: ${jobs.map((j: any) => `[${j.id}] ${j.title}`).join(", ")}`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              jobId: { type: Type.STRING },
              matchReason: { type: Type.STRING },
              matchScore: { type: Type.NUMBER }
            },
            required: ["jobId", "matchReason", "matchScore"]
          }
        }
      }
    });

    const recs = JSON.parse(response.text);
    const hydratedRecs = recs.map((r: any) => ({
      ...r,
      job: jobs.find((j: any) => j.id === r.jobId)
    })).filter((r: any) => r.job);

    res.json(hydratedRecs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failure" });
  }
});

export default router;
