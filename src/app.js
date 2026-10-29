import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { db } from "./config/firebase.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

// Configure CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    gymName: "Health Gym",
    database: "Firebase Cloud Firestore",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/settings", settingsRoutes);

// Root test route
app.get("/", (req, res) => {
  res.send("Health Gym Management API (Powered by Firebase Firestore) is running.");
});

// Error handling middleware
app.use(errorHandler);

export default app;
