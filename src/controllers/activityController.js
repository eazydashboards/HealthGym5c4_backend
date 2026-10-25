import { db } from "../config/firebase.js";

// GET /api/activity
export const getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const snap = await db.collection("activity_logs").get();
    let logs = [];

    snap.forEach((doc) => {
      logs.push({ _id: doc.id, id: doc.id, ...doc.data() });
    });

    logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = logs.length;
    const skip = (page - 1) * limit;
    const paginatedLogs = logs.slice(skip, skip + limit);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      logs: paginatedLogs,
    });
  } catch (error) {
    next(error);
  }
};
