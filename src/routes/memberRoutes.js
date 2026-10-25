import express from "express";
import {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  toggleCard,
  getPendingFees,
  getNextRegNo,
} from "../controllers/memberController.js";
import { protect, ownerOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All member routes require authentication

router.get("/next-reg", getNextRegNo);
router.get("/pending-fees", getPendingFees);

router.route("/")
  .get(getMembers)
  .post(createMember);

router.route("/:id")
  .get(getMemberById)
  .put(updateMember)
  .delete(ownerOnly, deleteMember);

router.post("/:id/toggle-card", toggleCard);

export default router;
