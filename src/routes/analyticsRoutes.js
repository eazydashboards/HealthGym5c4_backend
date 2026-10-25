import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import { protect, ownerOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, ownerOnly, getAnalytics);

export default router;
