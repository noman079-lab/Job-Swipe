import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Profile Image
router.post("/profile-image", async (req: any, res) => {
  const userId = getUserId(req);
  const { imageData } = req.body;
  const db = getDb();
  try {
    let imageUrl = imageData;
    if (imageData && !imageData.startsWith('data:image')) {
      imageUrl = `data:image/jpeg;base64,${imageData}`;
    }
    await db.query("UPDATE users SET profile_image_url = $1 WHERE id = $2", [imageUrl || null, userId]);
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// Generic Image Upload
router.post("/image", async (req: any, res) => {
  const { imageData } = req.body;
  try {
    let imageUrl = imageData;
    if (imageData && imageData.length > 500 && !imageData.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageData}`;
    }
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: "Image processing failure" });
  }
});

// NID Uploads
router.post("/nid", async (req: any, res) => {
  const userId = getUserId(req);
  const { frontImage, backImage, imageData } = req.body; // imageData for single uploads
  const db = getDb();
  try {
    const mainImg = frontImage || imageData;
    if (mainImg) {
        await db.query("UPDATE users SET nid_front_url = $1, nid_back_url = $2 WHERE id = $3", [mainImg, backImage || null, userId]);
    }
    res.json({ success: true, imageUrl: mainImg });
  } catch (err) {
    res.status(500).json({ error: "NID upload failed" });
  }
});

// Resume Upload
router.post("/resume", async (req: any, res) => {
  const userId = getUserId(req);
  const { resumeData } = req.body;
  const db = getDb();
  try {
    await db.query("UPDATE users SET resume_url = $1 WHERE id = $2", [resumeData, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Resume upload failed" });
  }
});

export default router;
