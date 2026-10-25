import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../config/firebase.js";
import { recordActivity } from "../utils/logger.js";

// HARDCODED OWNER CREDENTIALS
export const HARDCODED_OWNER = {
  id: "owner_health_gym_001",
  name: "Health Gym Owner",
  email: "admin@gmail.com",
  username: "admin",
  password: "admin123",
  role: "owner",
};

const generateToken = (id, role, name) => {
  const secret = process.env.JWT_SECRET || "health_gym_jwt_secret_key_2026_xyz";
  return jwt.sign({ id, role, name }, secret, {
    expiresIn: "30d",
  });
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your username/email and password",
      });
    }

    const cleanInput = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. CHECK HARDCODED OWNER CREDENTIALS FIRST
    const isOwner =
      (cleanInput === HARDCODED_OWNER.email || cleanInput === HARDCODED_OWNER.username) &&
      cleanPassword === HARDCODED_OWNER.password;

    if (isOwner) {
      const token = generateToken(HARDCODED_OWNER.id, "owner", HARDCODED_OWNER.name);
      return res.json({
        success: true,
        token,
        user: {
          _id: HARDCODED_OWNER.id,
          id: HARDCODED_OWNER.id,
          name: HARDCODED_OWNER.name,
          username: HARDCODED_OWNER.username,
          email: HARDCODED_OWNER.email,
          role: "owner",
        },
        message: `Welcome Owner! Logged into Health Gym successfully.`,
      });
    }

    // 2. CHECK EMPLOYEE USERS IN FIRESTORE
    let userSnap = await db
      .collection("users")
      .where("username", "==", cleanInput)
      .limit(1)
      .get();

    if (userSnap.empty) {
      userSnap = await db
        .collection("users")
        .where("email", "==", cleanInput)
        .limit(1)
        .get();
    }

    if (userSnap.empty) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please check your username or password.",
      });
    }

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(cleanPassword, userData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please check your username or password.",
      });
    }

    if (userData.status === "disabled") {
      return res.status(403).json({
        success: false,
        message: "Your employee account has been disabled. Please contact the owner.",
      });
    }

    const token = generateToken(userDoc.id, userData.role || "employee", userData.name);

    req.user = {
      _id: userDoc.id,
      id: userDoc.id,
      name: userData.name,
      role: userData.role || "employee",
    };

    await recordActivity(req, `Employee logged in`, { role: userData.role });

    res.json({
      success: true,
      token,
      user: {
        _id: userDoc.id,
        id: userDoc.id,
        name: userData.name,
        username: userData.username,
        email: userData.email,
        role: userData.role || "employee",
      },
      message: `Welcome back, ${userData.name}!`,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (req.user) {
      return res.json({
        success: true,
        user: req.user,
      });
    }
    res.status(401).json({ success: false, message: "Not authenticated" });
  } catch (error) {
    next(error);
  }
};
