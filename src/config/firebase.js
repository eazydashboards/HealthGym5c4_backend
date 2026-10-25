import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!getApps().length) {
  let credential;

  // 1. Check if FIREBASE_SERVICE_ACCOUNT_BASE64 env var is set
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      credential = cert(parsed);
      console.log("🔥 [Firebase] Loaded service account credentials from FIREBASE_SERVICE_ACCOUNT_BASE64");
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64 env var:", e.message);
    }
  }

  // 2. Check if FIREBASE_SERVICE_ACCOUNT (raw JSON) env var is set
  if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(parsed);
      console.log("🔥 [Firebase] Loaded service account credentials from FIREBASE_SERVICE_ACCOUNT");
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e.message);
    }
  }

  // 2. Search for JSON key files in server directory
  if (!credential) {
    const serverDir = path.resolve(__dirname, "../../");
    const possibleFiles = [
      "gym-management5c4-firebase-adminsdk-fbsvc-c8e72f7776.json",
      "serviceAccountKey.json",
    ];

    for (const f of possibleFiles) {
      const fullPath = path.join(serverDir, f);
      if (fs.existsSync(fullPath)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          credential = cert(fileData);
          console.log(`🔥 [Firebase] Loaded service account credentials from ${f}`);
          break;
        } catch (err) {
          console.error(`Error reading ${f}:`, err.message);
        }
      }
    }
  }

  if (credential) {
    initializeApp({ credential });
  } else {
    initializeApp();
  }

  console.log("🔥 [Firebase] Firestore initialized successfully for Health Gym!");
}

export const db = getFirestore();
export default db;
