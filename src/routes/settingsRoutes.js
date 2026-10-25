import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect, ownerOnly } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(protect, getSettings)
  .put(protect, ownerOnly, updateSettings);

export default router;
