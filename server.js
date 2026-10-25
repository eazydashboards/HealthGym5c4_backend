import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏋️  HEALTH GYM MANAGEMENT API SERVER RUNNING`);
  console.log(`🔥 Database: Firebase Cloud Firestore`);
  console.log(`🌐 Local API: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
