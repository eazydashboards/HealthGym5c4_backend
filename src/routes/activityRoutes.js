import express from "express";
import { getActivityLogs } from "../controllers/activityController.js";
import { protect, ownerOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, ownerOnly, getActivityLogs);

export default router;
