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
  password: process.env.Admin_Password,
  role: "owner",
};

const generateToken = (id, role, name) => {

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return jwt.sign({ id, role, name }, secret, {
    expiresIn: "1d",
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

    // 1. CHECK OWNER CREDENTIALS (Firestore doc first, fallback to env Admin_Password)
    const ownerEmailMatch =
      cleanInput === HARDCODED_OWNER.email ||
      cleanInput === HARDCODED_OWNER.username;

    let isOwner = false;
    if (ownerEmailMatch) {
      const ownerDoc = await db.collection("users").doc(HARDCODED_OWNER.id).get();
      let activeOwnerHash = HARDCODED_OWNER.password;
      if (ownerDoc.exists && ownerDoc.data()?.password) {
        activeOwnerHash = ownerDoc.data().password;
      }

      if (activeOwnerHash) {
        isOwner = await bcrypt.compare(cleanPassword, activeOwnerHash);
      }
    }

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

// POST /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please enter your current password and your new password.",
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    // 1. If requester is Owner / Admin
    if (req.user.role === "owner" || req.user.id === HARDCODED_OWNER.id) {
      const ownerDoc = await db.collection("users").doc(HARDCODED_OWNER.id).get();
      let activeHash = HARDCODED_OWNER.password;
      if (ownerDoc.exists && ownerDoc.data()?.password) {
        activeHash = ownerDoc.data().password;
      }

      if (!activeHash) {
        return res.status(500).json({
          success: false,
          message: "Admin password configuration missing on server.",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword.trim(), activeHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password does not match. Please verify your current password.",
        });
      }

      const newHash = await bcrypt.hash(newPassword.trim(), 12);
      await db.collection("users").doc(HARDCODED_OWNER.id).set(
        {
          id: HARDCODED_OWNER.id,
          name: HARDCODED_OWNER.name,
          username: HARDCODED_OWNER.username,
          email: HARDCODED_OWNER.email,
          role: "owner",
          password: newHash,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await recordActivity(req, `Admin changed their password successfully`);

      return res.json({
        success: true,
        message: "Admin password updated successfully! Please use your new password next time you login.",
      });
    }

    // 2. If requester is an Employee
    const userDocRef = db.collection("users").doc(req.user.id || req.user._id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(currentPassword.trim(), userData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password does not match. Please verify your current password.",
      });
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 12);
    await userDocRef.update({
      password: newHash,
      updatedAt: new Date().toISOString(),
    });

    await recordActivity(req, `Employee (${userData.name}) updated their password`);

    res.json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (error) {
    next(error);
  }
};
