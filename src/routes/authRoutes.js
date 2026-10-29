import express from "express";
import { login, getMe, changePassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/login", loginRateLimiter({ maxAttempts: 10, windowMs: 15 * 60 * 1000 }), login);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);

export default router;
