import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDb, getDb } from "./src/services/db";
import authRoutes from "./src/server/auth.routes";
import jobRoutes from "./src/server/job.routes";
import userRoutes from "./src/server/user.routes";
import chatRoutes from "./src/server/chat.routes";
import paymentRoutes from "./src/server/payment.routes";
import aiRoutes from "./src/server/ai.routes";
import employerRoutes from "./src/server/employer.routes";
import interviewRoutes from "./src/server/interview.routes";
import uploadRoutes from "./src/server/upload.routes";
import miscRoutes from "./src/server/misc.routes";
import adminRoutes from "./src/server/admin.routes";
import companyRoutes from "./src/server/company.routes";
import { authenticateToken } from "./src/server/middleware/auth.middleware";

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Public Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.use("/api/auth", authRoutes);

  // Protected Routes
  app.use("/api/jobs", jobRoutes); 
  app.use("/api/user", authenticateToken, userRoutes);
  app.use("/api/chat", authenticateToken, chatRoutes);
  app.use("/api/payments", authenticateToken, paymentRoutes);
  app.use("/api/ai", authenticateToken, aiRoutes);
  app.use("/api/employer", authenticateToken, employerRoutes);
  app.use("/api/interviews", authenticateToken, interviewRoutes);
  app.use("/api/company", authenticateToken, companyRoutes);
  app.use("/api/upload", authenticateToken, uploadRoutes);
  app.use("/api/misc", authenticateToken, miscRoutes);
  app.use("/api/admin", authenticateToken, adminRoutes);

  // Legacy/Root-level Aliases for backward compatibility with frontend
  app.get("/api/saved-jobs", authenticateToken, (req, res, next) => { req.url = "/saved-jobs"; userRoutes(req, res, next); });
  app.get("/api/saved-job-ids", authenticateToken, (req, res, next) => { req.url = "/saved-job-ids"; userRoutes(req, res, next); });
  app.get("/api/applied-job-ids", authenticateToken, (req, res, next) => { req.url = "/applied-job-ids"; userRoutes(req, res, next); });
  app.get("/api/notifications", authenticateToken, (req, res, next) => { req.url = "/notifications"; miscRoutes(req, res, next); });
  app.get("/api/conversations", authenticateToken, (req, res, next) => { req.url = "/conversations"; chatRoutes(req, res, next); });
  app.get("/api/conversations/with/:userId", authenticateToken, (req, res, next) => { req.url = `/conversations/with/${req.params.userId}`; chatRoutes(req, res, next); });
  app.get("/api/messages/unread-count", authenticateToken, (req, res, next) => { req.url = "/unread-count"; chatRoutes(req, res, next); });
  app.get("/api/messages/:conversationId", authenticateToken, (req, res, next) => { req.url = `/messages/${req.params.conversationId}`; chatRoutes(req, res, next); });
  
  app.post("/api/save-job", authenticateToken, (req, res, next) => { req.url = "/save"; jobRoutes(req, res, next); });
  app.post("/api/apply-job", authenticateToken, (req, res, next) => { req.url = "/apply"; jobRoutes(req, res, next); });
  app.post("/api/like-job", authenticateToken, (req: any, res: any, next: any) => { req.url = `/${req.body.jobId}/like`; jobRoutes(req, res, next); });
  app.post("/api/onboarding", authenticateToken, (req, res, next) => { req.url = "/onboarding"; miscRoutes(req, res, next); });
  app.post("/api/upload-profile-image", authenticateToken, (req, res, next) => { req.url = "/profile-image"; uploadRoutes(req, res, next); });
  app.post("/api/upload-nid", authenticateToken, (req, res, next) => { req.url = "/nid"; uploadRoutes(req, res, next); });
  app.post("/api/upload-resume", authenticateToken, (req, res, next) => { req.url = "/resume"; uploadRoutes(req, res, next); });
  app.post("/api/messages", authenticateToken, (req, res, next) => { req.url = "/messages"; chatRoutes(req, res, next); });
  app.post("/api/notifications/read", authenticateToken, (req, res, next) => { req.url = "/notifications/read"; miscRoutes(req, res, next); });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
