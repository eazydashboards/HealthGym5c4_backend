import jwt from "jsonwebtoken";
import { db } from "../config/firebase.js";
import { HARDCODED_OWNER } from "../controllers/authController.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    const decoded = jwt.verify(token, secret);

    // Hardcoded owner check
    if (decoded.id === HARDCODED_OWNER.id || decoded.role === "owner") {
      req.user = {
        _id: HARDCODED_OWNER.id,
        id: HARDCODED_OWNER.id,
        name: decoded.name || HARDCODED_OWNER.name,
        username: HARDCODED_OWNER.username,
        email: HARDCODED_OWNER.email,
        role: "owner",
        status: "active",
      };
      return next();
    }

    // Lookup employee in Firestore
    const userDoc = await db.collection("users").doc(decoded.id).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists in system.",
      });
    }

    const userData = userDoc.data();

    if (userData.status === "disabled") {
      return res.status(403).json({
        success: false,
        message: "Your employee account has been disabled. Please contact the owner.",
      });
    }

    req.user = {
      _id: userDoc.id,
      id: userDoc.id,
      name: userData.name,
      username: userData.username,
      email: userData.email,
      role: userData.role || "employee",
      status: userData.status,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again.",
    });
  }
};

export const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === "owner") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access restricted: Owner permissions required.",
    });
  }
};
