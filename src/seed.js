import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { db } from "./config/firebase.js";

const runSeed = async () => {
  try {
    const insertDemoData = process.argv.includes("--demo");
    console.log("🔥 Connecting to Firebase Firestore for Health Gym initialization...");

    if (insertDemoData) {
      console.log("⚠️ --demo flag passed: Cleaning existing collections and seeding sample members...");
      const collectionsToClean = ["members", "payments", "users", "activity_logs", "settings"];
      for (const col of collectionsToClean) {
        const snap = await db.collection(col).get();
        const batch = db.batch();
        snap.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🧹 Cleaned collection: ${col}`);
      }
    } else {
      console.log("🛡️ Safe Mode: Preserving your existing members and payments (No demo data inserted).");
    }

    // 2. Default Settings for Health Gym (create if missing or in demo mode)
    const settingsDoc = await db.collection("settings").doc("general").get();
    if (!settingsDoc.exists || insertDemoData) {
      console.log("⚙️ Creating default Health Gym Settings...");
      await db.collection("settings").doc("general").set({
        gymName: "Health Gym",
        defaultMonthlyFee: 2000,
        defaultRegistrationFee: 1000,
        cardFee: 100,
        paymentInfo: {
          easypaisaTitle: "Health Gym Official",
          easypaisaNumber: "03001234567",
          jazzcashTitle: "Health Gym Official",
          jazzcashNumber: "03019876543",
          bankName: "Meezan Bank Ltd",
          bankAccountTitle: "Health Gym Main Account",
          bankAccountNumber: "02010109988776",
          bankIban: "PK45MEZN0002010109988776",
        },
        updatedAt: new Date().toISOString(),
        handleBy: "Owner",
      });
    }

    // 3. Create Sample Employee in Firestore if none exists
    const usersSnap = await db.collection("users").get();
    let empRef = null;
    if (usersSnap.empty || insertDemoData) {
      console.log("👤 Creating staff employee account in Firestore...");
      const employeePassword = await bcrypt.hash("staff123", 10);
      empRef = await db.collection("users").add({
        name: "Hamza Tariq (Staff)",
        username: "staff",
        email: "staff@gmail.com",
        password: employeePassword,
        role: "employee",
        status: "active",
        handleBy: "Owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Employee created in Firestore -> Username: "staff", Password: "staff123"`);
    } else {
      console.log(`ℹ️ User accounts already exist (${usersSnap.size} accounts found).`);
    }

    // 4. Create Sample Members ONLY IF --demo flag was passed
    if (insertDemoData) {
      console.log("👥 Creating sample members for Health Gym...");
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const sampleMembers = [
        {
          name: "Ali Raza",
          regNo: "REG-001",
          joiningDate: new Date(currentYear, 0, 5).toISOString(),
          fatherName: "Muhammad Raza",
          address: "Model Town, Block B",
          mobile: "03001112233",
          monthlyFee: 2000,
          registrationFee: 1000,
          cardIssued: true,
          cardIssuedDate: new Date(currentYear, 0, 5).toISOString(),
          status: "active",
          handleBy: "Health Gym Owner",
          addedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
          createdAt: new Date(currentYear, 0, 5).toISOString(),
        },
        {
          name: "Usman Ghani",
          regNo: "REG-002",
          joiningDate: new Date(currentYear, 0, 10).toISOString(),
          fatherName: "Abdul Ghani",
          address: "Gulshan Iqbal, House 42",
          mobile: "03124445566",
          monthlyFee: 2000,
          registrationFee: 1000,
          cardIssued: true,
          cardIssuedDate: new Date(currentYear, 0, 10).toISOString(),
          status: "active",
          handleBy: "Hamza Tariq (Staff)",
          addedBy: { id: empRef ? empRef.id : "staff_01", name: "Hamza Tariq (Staff)", role: "employee" },
          createdAt: new Date(currentYear, 0, 10).toISOString(),
        },
        {
          name: "Bilal Ahmed",
          regNo: "REG-003",
          joiningDate: new Date(currentYear, 1, 1).toISOString(),
          fatherName: "Bashir Ahmed",
          address: "Satellite Town, St 4",
          mobile: "03337778899",
          monthlyFee: 2500,
          registrationFee: 1000,
          cardIssued: false,
          status: "active",
          handleBy: "Health Gym Owner",
          addedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
          createdAt: new Date(currentYear, 1, 1).toISOString(),
        },
        {
          name: "Zubair Khan",
          regNo: "REG-004",
          joiningDate: new Date(currentYear, 1, 15).toISOString(),
          fatherName: "Akram Khan",
          address: "Commercial Market, Flat 3",
          mobile: "03459990011",
          monthlyFee: 1800,
          registrationFee: 1000,
          cardIssued: true,
          cardIssuedDate: new Date(currentYear, 1, 15).toISOString(),
          status: "active",
          handleBy: "Hamza Tariq (Staff)",
          addedBy: { id: empRef ? empRef.id : "staff_01", name: "Hamza Tariq (Staff)", role: "employee" },
          createdAt: new Date(currentYear, 1, 15).toISOString(),
        },
        {
          name: "Hamid Mehmood",
          regNo: "REG-005",
          joiningDate: new Date(currentYear, currentMonth - 1, 2).toISOString(),
          fatherName: "Mehmood Ul Hassan",
          address: "DHA Phase 3",
          mobile: "03215556677",
          monthlyFee: 2000,
          registrationFee: 1000,
          cardIssued: true,
          cardIssuedDate: new Date().toISOString(),
          status: "active",
          handleBy: "Health Gym Owner",
          addedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
          createdAt: new Date().toISOString(),
        },
        {
          name: "Tariq Jameel",
          regNo: "REG-006",
          joiningDate: new Date(currentYear, 0, 1).toISOString(),
          fatherName: "Jameel Ahmed",
          address: "Wapda Town",
          mobile: "03008889900",
          monthlyFee: 2000,
          registrationFee: 1000,
          cardIssued: false,
          status: "inactive",
          handleBy: "Hamza Tariq (Staff)",
          addedBy: { id: empRef ? empRef.id : "staff_01", name: "Hamza Tariq (Staff)", role: "employee" },
          createdAt: new Date(currentYear, 0, 1).toISOString(),
        },
      ];

      const memberRefs = [];
      for (const m of sampleMembers) {
        const ref = await db.collection("members").add(m);
        memberRefs.push({ id: ref.id, ...m });
      }

    // 5. Create Sample Fee Payments with "handleBy"
    console.log("💳 Creating sample fee and card payments in Firestore...");
    const staffId = empRef ? empRef.id : "staff_01";
    const samplePayments = [
      // Ali Raza (REG-001): Registration + Card + Jan + Current Month Fee
      {
        member: memberRefs[0].id,
        memberId: memberRefs[0].id,
        memberName: memberRefs[0].name,
        memberRegNo: memberRefs[0].regNo,
        type: "registration",
        amount: 1000,
        year: currentYear,
        method: "Cash",
        paymentDate: new Date(currentYear, 0, 5).toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date(currentYear, 0, 5).toISOString(),
      },
      {
        member: memberRefs[0].id,
        memberId: memberRefs[0].id,
        memberName: memberRefs[0].name,
        memberRegNo: memberRefs[0].regNo,
        type: "card",
        amount: 100,
        year: currentYear,
        method: "Cash",
        paymentDate: new Date(currentYear, 0, 5).toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date(currentYear, 0, 5).toISOString(),
      },
      {
        member: memberRefs[0].id,
        memberId: memberRefs[0].id,
        memberName: memberRefs[0].name,
        memberRegNo: memberRefs[0].regNo,
        type: "monthly",
        months: [1, currentMonth],
        year: currentYear,
        amount: 4000,
        method: "Cash",
        paymentDate: new Date().toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date().toISOString(),
      },

      // Usman Ghani (REG-002): Registration + Card + Jan Fee (Current month pending)
      {
        member: memberRefs[1].id,
        memberId: memberRefs[1].id,
        memberName: memberRefs[1].name,
        memberRegNo: memberRefs[1].regNo,
        type: "registration",
        amount: 1000,
        year: currentYear,
        method: "JazzCash",
        transactionId: "JC9912000",
        paymentDate: new Date(currentYear, 0, 10).toISOString(),
        handleBy: "Hamza Tariq (Staff)",
        receivedBy: { id: staffId, name: "Hamza Tariq (Staff)", role: "employee" },
        createdAt: new Date(currentYear, 0, 10).toISOString(),
      },
      {
        member: memberRefs[1].id,
        memberId: memberRefs[1].id,
        memberName: memberRefs[1].name,
        memberRegNo: memberRefs[1].regNo,
        type: "card",
        amount: 100,
        year: currentYear,
        method: "JazzCash",
        transactionId: "JC9912001",
        paymentDate: new Date(currentYear, 0, 10).toISOString(),
        handleBy: "Hamza Tariq (Staff)",
        receivedBy: { id: staffId, name: "Hamza Tariq (Staff)", role: "employee" },
        createdAt: new Date(currentYear, 0, 10).toISOString(),
      },
      {
        member: memberRefs[1].id,
        memberId: memberRefs[1].id,
        memberName: memberRefs[1].name,
        memberRegNo: memberRefs[1].regNo,
        type: "monthly",
        months: [1],
        year: currentYear,
        amount: 2000,
        method: "JazzCash",
        transactionId: "JC9912002",
        paymentDate: new Date(currentYear, 0, 10).toISOString(),
        handleBy: "Hamza Tariq (Staff)",
        receivedBy: { id: staffId, name: "Hamza Tariq (Staff)", role: "employee" },
        createdAt: new Date(currentYear, 0, 10).toISOString(),
      },

      // Zubair Khan (REG-004): Registration + Current Month Fee via Easypaisa
      {
        member: memberRefs[3].id,
        memberId: memberRefs[3].id,
        memberName: memberRefs[3].name,
        memberRegNo: memberRefs[3].regNo,
        type: "registration",
        amount: 1000,
        year: currentYear,
        method: "Easypaisa",
        transactionId: "EP7719283",
        paymentDate: new Date().toISOString(),
        handleBy: "Hamza Tariq (Staff)",
        receivedBy: { id: staffId, name: "Hamza Tariq (Staff)", role: "employee" },
        createdAt: new Date().toISOString(),
      },
      {
        member: memberRefs[3].id,
        memberId: memberRefs[3].id,
        memberName: memberRefs[3].name,
        memberRegNo: memberRefs[3].regNo,
        type: "monthly",
        months: [currentMonth],
        year: currentYear,
        amount: 1800,
        method: "Easypaisa",
        transactionId: "EP7719284",
        paymentDate: new Date().toISOString(),
        handleBy: "Hamza Tariq (Staff)",
        receivedBy: { id: staffId, name: "Hamza Tariq (Staff)", role: "employee" },
        createdAt: new Date().toISOString(),
      },

      // Hamid Mehmood (REG-005): Registration + Card + Current Month Fee via Bank
      {
        member: memberRefs[4].id,
        memberId: memberRefs[4].id,
        memberName: memberRefs[4].name,
        memberRegNo: memberRefs[4].regNo,
        type: "registration",
        amount: 1000,
        year: currentYear,
        method: "Bank Transfer",
        transactionId: "BNK5567812",
        paymentDate: new Date().toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date().toISOString(),
      },
      {
        member: memberRefs[4].id,
        memberId: memberRefs[4].id,
        memberName: memberRefs[4].name,
        memberRegNo: memberRefs[4].regNo,
        type: "card",
        amount: 100,
        year: currentYear,
        method: "Bank Transfer",
        transactionId: "BNK5567813",
        paymentDate: new Date().toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date().toISOString(),
      },
      {
        member: memberRefs[4].id,
        memberId: memberRefs[4].id,
        memberName: memberRefs[4].name,
        memberRegNo: memberRefs[4].regNo,
        type: "monthly",
        months: [currentMonth],
        year: currentYear,
        amount: 2000,
        method: "Bank Transfer",
        transactionId: "BNK5567814",
        paymentDate: new Date().toISOString(),
        handleBy: "Health Gym Owner",
        receivedBy: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        createdAt: new Date().toISOString(),
      },
    ];

    for (const p of samplePayments) {
      await db.collection("payments").add(p);
    }

      // 6. Initial Activity Logs
      console.log("📜 Adding audit logs into Firestore...");
      await db.collection("activity_logs").add({
        user: { id: "owner_health_gym_001", name: "Health Gym Owner", role: "owner" },
        handleBy: "Health Gym Owner",
        action: "Initialized Health Gym Cloud Firestore Database",
        details: { gymName: "Health Gym" },
        createdAt: new Date().toISOString(),
      });
      if (empRef) {
        await db.collection("activity_logs").add({
          user: { id: empRef.id, name: "Hamza Tariq (Staff)", role: "employee" },
          handleBy: "Hamza Tariq (Staff)",
          action: "Registered member Usman Ghani (REG-002)",
          details: { regNo: "REG-002" },
          createdAt: new Date().toISOString(),
        });
      }
    } // end if (insertDemoData)

    console.log("\n=======================================================");
    console.log("🎉 FIREBASE FIRESTORE SEEDING COMPLETED FOR HEALTH GYM!");
    console.log("-------------------------------------------------------");
    console.log("👑 HARDCODED OWNER LOGIN:");
    console.log("   Email:    admin@gmail.com (or username: admin)");
    console.log("   Password: admin123");
    console.log("-------------------------------------------------------");
    console.log("👷 FIRESTORE EMPLOYEE LOGIN:");
    console.log("   Username: staff");
    console.log("   Password: staff123");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Firebase Seed Failed:", error);
    process.exit(1);
  }
};

runSeed();
