import express from "express";
import { createPayment, getPayments, deletePayment } from "../controllers/paymentController.js";
import { protect, ownerOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .post(createPayment)
  .get(getPayments);

router.delete("/:id", ownerOnly, deletePayment);

export default router;
