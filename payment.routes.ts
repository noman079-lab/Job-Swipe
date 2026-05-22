import { Router } from "express";
import { getDb } from "../services/db";

const router = Router();
const getUserId = (req: any) => req.user.userId || req.user.id;

// Create a pending payment order
router.post("/create-order", async (req: any, res) => {
  const userId = getUserId(req);
  const { planType, amount } = req.body;
  if (!planType || !amount) return res.status(400).json({ error: "Missing required fields" });

  const db = getDb();
  try {
    const result = await db.query(`
      INSERT INTO payments (user_id, amount, plan_type, status, method)
      VALUES ($1, $2, $3, 'pending', 'bKash')
      RETURNING id
    `, [userId, amount, planType]);
    
    res.json({ success: true, orderId: result.rows[0].id });
  } catch (err) {
    console.error("Order Creation Error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Verify manual bKash/Nagad/Rocket payment using Transaction ID
router.post("/verify", async (req: any, res) => {
  const userId = getUserId(req);
  const { orderId, transactionId, method } = req.body;
  const db = getDb();

  if (!orderId || !transactionId) {
    return res.status(400).json({ error: "Missing Order ID or Transaction ID" });
  }

  // Basic TrxID length check
  if (transactionId.trim().length < 8) {
    return res.status(400).json({ error: "Invalid Transaction ID. Must be at least 8 characters." });
  }

  try {
    // 1. Check if the Transaction ID has already been verified and used to avoid double-spend hacks
    const duplicateCheck = await db.query(
      "SELECT id FROM payments WHERE transaction_id = $1 AND status = 'completed'", 
      [transactionId.trim()]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "This Transaction ID has already been utilized/verified." });
    }

    // 2. Retrieve pending payment order
    const orderQuery = await db.query(
      "SELECT * FROM payments WHERE id = $1 AND user_id = $2",
      [orderId, userId]
    );
    if (orderQuery.rows.length === 0) {
      return res.status(404).json({ error: "Payment order not found." });
    }

    const order = orderQuery.rows[0];
    const plan = order.plan_type;

    // 3. Update payment status to completed with transaction_id and method
    await db.query(`
      UPDATE payments 
      SET status = 'completed', method = $1, transaction_id = $2
      WHERE id = $3
    `, [method || 'bKash', transactionId.trim(), orderId]);

    // 4. Update user's subscription details in DB
    await db.query(`
      UPDATE users 
      SET subscription_plan = $1, 
          subscription_start_date = CURRENT_TIMESTAMP,
          subscription_end_date = CURRENT_TIMESTAMP + interval '1 month',
          role = 'employer' -- Ensure they represent recruiter status correctly if upgraded
      WHERE id = $2
    `, [plan, userId]);

    // 5. Reset employer posting usage back to 0 for unlimited or pro limits
    await db.query(`
      INSERT INTO employer_usage (employer_id, monthly_post_count, last_reset_date)
      VALUES ($1, 0, CURRENT_TIMESTAMP)
      ON CONFLICT (employer_id) 
      DO UPDATE SET monthly_post_count = 0, last_reset_date = CURRENT_TIMESTAMP
    `, [userId]);

    // 6. Spawn a system notification for the upgrade!
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, 'subscription')
    `, [userId, "Upgrade Perfected! 🚀", `Your account has successfully transitioned to the ${plan.toUpperCase()} plan.`]);

    res.json({ success: true, plan });
  } catch (err) {
    console.error("Payment Verification Error:", err);
    res.status(500).json({ error: "Database execution failed during payment verification" });
  }
});

export default router;
