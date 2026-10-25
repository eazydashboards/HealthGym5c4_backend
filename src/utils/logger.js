import { db } from "../config/firebase.js";

export const recordActivity = async (req, action, details = {}) => {
  try {
    if (!req.user) return;
    const logData = {
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
      handleBy: req.user.name,
      action,
      details,
      createdAt: new Date().toISOString(),
    };

    await db.collection("activity_logs").add(logData);
  } catch (err) {
    console.error("Failed to record activity log in Firestore:", err.message);
  }
};
