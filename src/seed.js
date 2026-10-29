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

    // ── Settings ──────────────────────────────────────────────────────────────
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

    // ── Staff Account ─────────────────────────────────────────────────────────
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
      console.log(`✅ Employee created → Username: "staff", Password: "staff123"`);
    } else {
      console.log(`ℹ️ User accounts already exist (${usersSnap.size} accounts found).`);
    }

    // ── Demo Data ─────────────────────────────────────────────────────────────
    if (insertDemoData) {
      const staffId  = empRef ? empRef.id : "staff_01";
      const staffName = "Hamza Tariq (Staff)";
      const ownerId  = "owner_health_gym_001";
      const ownerName = "Health Gym Owner";

      const CY = new Date().getFullYear();      // 2026
      const CM = new Date().getMonth() + 1;     // 10 (October)

      /* ── helper ── */
      const d = (year, month, day) => new Date(year, month - 1, day).toISOString();
      const today = () => new Date().toISOString();

      /* ─────────────────────────────────────────────────────────────────────
         MEMBERS — 25 realistic Pakistani gym members
         Scenario mix:
           • Old members (joined Jan–Mar 2026) – some fully paid, some with dues
           • Mid-year members (Apr–Jul 2026)
           • Recent members (Aug–Oct 2026) – mostly paid up to now
           • 3 inactive / left members
         ─────────────────────────────────────────────────────────────────── */
      console.log("👥 Creating 25 realistic gym members...");

      // const memberDefs = [
      //   // ── LONG-STANDING MEMBERS (Jan 2026) ──────────────────────────────
      //   {
      //     name: "Ali Raza",          regNo: "REG-001",
      //     joiningDate: d(CY,1,3),    fatherName: "Muhammad Raza",
      //     address: "Model Town, Block B, Lahore",  mobile: "03001112233",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,1,3), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,1,3),
      //   },
      //   {
      //     name: "Usman Ghani",       regNo: "REG-002",
      //     joiningDate: d(CY,1,7),    fatherName: "Abdul Ghani",
      //     address: "Gulshan Iqbal, House 42, Karachi", mobile: "03124445566",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,1,7), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,1,7),
      //   },
      //   {
      //     name: "Bilal Ahmed",       regNo: "REG-003",
      //     joiningDate: d(CY,1,10),   fatherName: "Bashir Ahmed",
      //     address: "Satellite Town, Street 4, Rawalpindi", mobile: "03337778899",
      //     monthlyFee: 2500, registrationFee: 1000, cardIssued: false,
      //     status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,1,10),
      //   },
      //   {
      //     name: "Zubair Khan",       regNo: "REG-004",
      //     joiningDate: d(CY,1,15),   fatherName: "Akram Khan",
      //     address: "Commercial Market, Flat 3, Faisalabad", mobile: "03459990011",
      //     monthlyFee: 1800, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,1,15), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,1,15),
      //   },
      //   {
      //     name: "Tariq Mahmood",     regNo: "REG-005",
      //     joiningDate: d(CY,1,20),   fatherName: "Mahmood Ul Hassan",
      //     address: "DHA Phase 3, Lahore", mobile: "03215556677",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,1,20), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,1,20),
      //   },
      //   // ── FEB 2026 JOINERS ──────────────────────────────────────────────
      //   {
      //     name: "Shahid Iqbal",      regNo: "REG-006",
      //     joiningDate: d(CY,2,1),    fatherName: "Iqbal Hussain",
      //     address: "Wapda Town, Block C, Lahore", mobile: "03008889900",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,2,1), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,2,1),
      //   },
      //   {
      //     name: "Kamran Butt",       regNo: "REG-007",
      //     joiningDate: d(CY,2,10),   fatherName: "Asif Butt",
      //     address: "Johar Town, Lahore", mobile: "03321234567",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,2,10), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,2,10),
      //   },
      //   {
      //     name: "Naeem Akhtar",      regNo: "REG-008",
      //     joiningDate: d(CY,2,18),   fatherName: "Akhtar Ali",
      //     address: "Gulberg III, Lahore", mobile: "03119988776",
      //     monthlyFee: 3000, registrationFee: 1000, cardIssued: false,
      //     status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,2,18),
      //   },
      //   // ── MARCH 2026 ────────────────────────────────────────────────────
      //   {
      //     name: "Faisal Rehman",     regNo: "REG-009",
      //     joiningDate: d(CY,3,5),    fatherName: "Rehman Ullah",
      //     address: "Bahria Town Phase 4, Rawalpindi", mobile: "03234567890",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,3,5), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,3,5),
      //   },
      //   {
      //     name: "Yasir Mehmood",     regNo: "REG-010",
      //     joiningDate: d(CY,3,12),   fatherName: "Mehmood Khan",
      //     address: "G-11/2, Islamabad", mobile: "03451239876",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,3,12), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,3,12),
      //   },
      //   // ── APRIL 2026 ────────────────────────────────────────────────────
      //   {
      //     name: "Junaid Aslam",      regNo: "REG-011",
      //     joiningDate: d(CY,4,1),    fatherName: "Aslam Pervaiz",
      //     address: "Township, Sector B, Lahore", mobile: "03041112233",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,4,1), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,4,1),
      //   },
      //   {
      //     name: "Imran Siddiqui",    regNo: "REG-012",
      //     joiningDate: d(CY,4,15),   fatherName: "Siddique Ahmad",
      //     address: "North Nazimabad, Karachi", mobile: "03162223344",
      //     monthlyFee: 2500, registrationFee: 1000, cardIssued: false,
      //     status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,4,15),
      //   },
      //   // ── MAY 2026 ──────────────────────────────────────────────────────
      //   {
      //     name: "Adeel Hassan",      regNo: "REG-013",
      //     joiningDate: d(CY,5,3),    fatherName: "Hassan Nawaz",
      //     address: "F-7/2, Islamabad", mobile: "03307778899",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,5,3), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,5,3),
      //   },
      //   {
      //     name: "Waqas Nawaz",       regNo: "REG-014",
      //     joiningDate: d(CY,5,20),   fatherName: "Nawaz Sharif",
      //     address: "Shadman Colony, Lahore", mobile: "03489990022",
      //     monthlyFee: 1800, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,5,20), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,5,20),
      //   },
      //   // ── JUNE 2026 ─────────────────────────────────────────────────────
      //   {
      //     name: "Saad Farooq",       regNo: "REG-015",
      //     joiningDate: d(CY,6,10),   fatherName: "Farooq Ahmed",
      //     address: "Cavalry Ground, Lahore", mobile: "03561234455",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,6,10), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,6,10),
      //   },
      //   // ── JULY 2026 ─────────────────────────────────────────────────────
      //   {
      //     name: "Hamid Ali",         regNo: "REG-016",
      //     joiningDate: d(CY,7,5),    fatherName: "Ali Akbar",
      //     address: "Garden Town, Lahore", mobile: "03008887766",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,7,5), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,7,5),
      //   },
      //   {
      //     name: "Rizwan Javed",      regNo: "REG-017",
      //     joiningDate: d(CY,7,18),   fatherName: "Javed Iqbal",
      //     address: "Allama Iqbal Town, Lahore", mobile: "03211122334",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: false,
      //     status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,7,18),
      //   },
      //   // ── AUGUST 2026 ───────────────────────────────────────────────────
      //   {
      //     name: "Salman Rauf",       regNo: "REG-018",
      //     joiningDate: d(CY,8,1),    fatherName: "Abdul Rauf",
      //     address: "Cantt Area, Rawalpindi", mobile: "03345556677",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,8,1), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,8,1),
      //   },
      //   {
      //     name: "Asad Malik",        regNo: "REG-019",
      //     joiningDate: d(CY,8,15),   fatherName: "Malik Afzal",
      //     address: "Valencia Town, Lahore", mobile: "03126667788",
      //     monthlyFee: 2500, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,8,15), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,8,15),
      //   },
      //   // ── SEPTEMBER 2026 ────────────────────────────────────────────────
      //   {
      //     name: "Noman Rasheed",     regNo: "REG-020",
      //     joiningDate: d(CY,9,2),    fatherName: "Rasheed Ahmed",
      //     address: "Iqbal Town, Lahore", mobile: "03468889900",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,9,2), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,9,2),
      //   },
      //   {
      //     name: "Omar Farhan",       regNo: "REG-021",
      //     joiningDate: d(CY,9,20),   fatherName: "Farhan Aziz",
      //     address: "Askari 10, Lahore", mobile: "03009998877",
      //     monthlyFee: 3000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,9,20), status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,9,20),
      //   },
      //   // ── OCTOBER 2026 (Current Month) ──────────────────────────────────
      //   {
      //     name: "Danish Khalid",     regNo: "REG-022",
      //     joiningDate: d(CY,CM,5),   fatherName: "Khalid Mehmood",
      //     address: "EME Society, Lahore", mobile: "03131234567",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,CM,5), status: "active", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,CM,5),
      //   },
      //   {
      //     name: "Fahad Zaman",       regNo: "REG-023",
      //     joiningDate: d(CY,CM,12),  fatherName: "Zaman Gul",
      //     address: "Johar Town Block Q, Lahore", mobile: "03054443322",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: false,
      //     status: "active", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,CM,12),
      //   },
      //   // ── INACTIVE MEMBERS ─────────────────────────────────────────────
      //   {
      //     name: "Tariq Jameel",      regNo: "REG-024",
      //     joiningDate: d(CY,1,5),    fatherName: "Jameel Ahmed",
      //     address: "Wapda Town, Lahore", mobile: "03006665544",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: false,
      //     status: "inactive", handleBy: staffName,
      //     addedBy: { id: staffId, name: staffName, role: "employee" },
      //     createdAt: d(CY,1,5),
      //   },
      //   {
      //     name: "Kashif Pervaiz",    regNo: "REG-025",
      //     joiningDate: d(CY,3,1),    fatherName: "Pervaiz Ahmad",
      //     address: "Gulshan-e-Ravi, Lahore", mobile: "03218887766",
      //     monthlyFee: 2000, registrationFee: 1000, cardIssued: true,
      //     cardIssuedDate: d(CY,3,1), status: "inactive", handleBy: ownerName,
      //     addedBy: { id: ownerId, name: ownerName, role: "owner" },
      //     createdAt: d(CY,3,1),
      //   },
      // ];

      // Insert members
      // const memberRefs = [];
      // for (const m of memberDefs) {
      //   const ref = await db.collection("members").add(m);
      //   memberRefs.push({ id: ref.id, ...m });
      //   process.stdout.write(".");
      // }
      // console.log(`\n✅ ${memberRefs.length} members created.`);

      /* ───────────────────────────────────────────────────────────────────
         PAYMENTS — Realistic payment history
         Logic per member:
           REG-001 Ali Raza       → Paid Jan–Oct (all months, fully up to date)
           REG-002 Usman Ghani    → Paid Jan–Sep (Oct due)
           REG-003 Bilal Ahmed    → Paid Jan–Jul (Aug–Oct due, 3 months overdue)
           REG-004 Zubair Khan    → Paid Jan–Oct (fully paid)
           REG-005 Tariq Mahmood  → Paid Jan–Oct (all paid)
           REG-006 Shahid Iqbal   → Paid Feb–Sep (Oct due)
           REG-007 Kamran Butt    → Paid Feb–Oct (all paid)
           REG-008 Naeem Akhtar   → Paid Feb–Aug (Sep–Oct due, 2 months overdue)
           REG-009 Faisal Rehman  → Paid Mar–Oct (all paid)
           REG-010 Yasir Mehmood  → Paid Mar–Sep (Oct due)
           REG-011 Junaid Aslam   → Paid Apr–Oct (all paid)
           REG-012 Imran Siddiqui → Paid Apr–Jul (Aug–Oct due, 3 months overdue)
           REG-013 Adeel Hassan   → Paid May–Oct (all paid)
           REG-014 Waqas Nawaz    → Paid May–Oct (all paid)
           REG-015 Saad Farooq    → Paid Jun–Sep (Oct due)
           REG-016 Hamid Ali      → Paid Jul–Oct (all paid)
           REG-017 Rizwan Javed   → Paid Jul–Aug (Sep–Oct due)
           REG-018 Salman Rauf    → Paid Aug–Oct (all paid)
           REG-019 Asad Malik     → Paid Aug–Oct (all paid)
           REG-020 Noman Rasheed  → Paid Sep–Oct (all paid)
           REG-021 Omar Farhan    → Paid Sep (Oct due)
           REG-022 Danish Khalid  → Paid Oct (new, current month paid)
           REG-023 Fahad Zaman    → Not paid yet (very new, Oct due)
           REG-024 Tariq Jameel   → Inactive — paid Jan only
           REG-025 Kashif Pervaiz → Inactive — paid Mar–May only
         ─────────────────────────────────────────────────────────────────── */
      console.log("💳 Creating realistic payment history...");

      // Helper: build a monthly payment doc
      const mp = (mRef, months, year, amount, method, txnId, date, handler, hId, hRole) => ({
        member:        mRef.id,
        memberId:      mRef.id,
        memberName:    mRef.name,
        memberRegNo:   mRef.regNo,
        type:          "monthly",
        months,
        year,
        amount,
        method,
        ...(txnId ? { transactionId: txnId } : {}),
        paymentDate:   date,
        handleBy:      handler,
        receivedBy:    { id: hId, name: handler, role: hRole },
        createdAt:     date,
      });

      // Helper: registration payment
      const rp = (mRef, date, handler, hId, hRole, method = "Cash", txn = "") => ({
        member:     mRef.id,
        memberId:   mRef.id,
        memberName: mRef.name,
        memberRegNo: mRef.regNo,
        type:       "registration",
        amount:     mRef.registrationFee || 1000,
        year:       CY,
        method,
        ...(txn ? { transactionId: txn } : {}),
        paymentDate: date,
        handleBy:   handler,
        receivedBy: { id: hId, name: handler, role: hRole },
        createdAt:  date,
      });

      // Helper: card payment
      const cp = (mRef, date, handler, hId, hRole, method = "Cash") => ({
        member:     mRef.id,
        memberId:   mRef.id,
        memberName: mRef.name,
        memberRegNo: mRef.regNo,
        type:       "card",
        amount:     100,
        year:       CY,
        method,
        paymentDate: date,
        handleBy:   handler,
        receivedBy: { id: hId, name: handler, role: hRole },
        createdAt:  date,
      });

      const [
        m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,
        m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,
        m21,m22,m23,m24,m25
      ] = memberRefs;

      const payments = [
        // ── REG-001 Ali Raza — fully paid Jan→Oct ──────────────────────────
        rp(m1, d(CY,1,3), ownerName, ownerId, "owner"),
        cp(m1, d(CY,1,3), ownerName, ownerId, "owner"),
        mp(m1,[1,2,3],CY,6000,"Cash","",d(CY,3,31),ownerName,ownerId,"owner"),
        mp(m1,[4,5,6],CY,6000,"Cash","",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m1,[7,8,9],CY,6000,"JazzCash","JC1000001",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m1,[10],  CY,2000,"Cash","",d(CY,10,3),ownerName,ownerId,"owner"),

        // ── REG-002 Usman Ghani — Jan→Sep paid, Oct due ────────────────────
        rp(m2, d(CY,1,7), staffName, staffId, "employee","JazzCash","JC9912000"),
        cp(m2, d(CY,1,7), staffName, staffId, "employee","JazzCash"),
        mp(m2,[1,2,3],CY,6000,"JazzCash","JC9912010",d(CY,3,31),staffName,staffId,"employee"),
        mp(m2,[4,5,6],CY,6000,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m2,[7,8,9],CY,6000,"Easypaisa","EP1100001",d(CY,9,28),staffName,staffId,"employee"),

        // ── REG-003 Bilal Ahmed — Jan→Jul paid, Aug–Oct due ────────────────
        rp(m3, d(CY,1,10), ownerName, ownerId, "owner"),
        mp(m3,[1,2,3],CY,7500,"Cash","",d(CY,3,31),ownerName,ownerId,"owner"),
        mp(m3,[4,5,6],CY,7500,"Cash","",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m3,[7],   CY,2500,"Cash","",d(CY,7,31),ownerName,ownerId,"owner"),

        // ── REG-004 Zubair Khan — Jan→Oct fully paid ───────────────────────
        rp(m4, d(CY,1,15), staffName, staffId, "employee","Easypaisa","EP7719283"),
        cp(m4, d(CY,1,15), staffName, staffId, "employee","Easypaisa"),
        mp(m4,[1,2,3],CY,5400,"Easypaisa","EP7719300",d(CY,3,31),staffName,staffId,"employee"),
        mp(m4,[4,5,6],CY,5400,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m4,[7,8,9],CY,5400,"JazzCash","JC2200001",d(CY,9,30),staffName,staffId,"employee"),
        mp(m4,[10],  CY,1800,"Cash","",d(CY,10,2),staffName,staffId,"employee"),

        // ── REG-005 Tariq Mahmood — Jan→Oct fully paid ─────────────────────
        rp(m5, d(CY,1,20), ownerName, ownerId, "owner"),
        cp(m5, d(CY,1,20), ownerName, ownerId, "owner"),
        mp(m5,[1,2,3],CY,6000,"Bank Transfer","BNK0010001",d(CY,3,31),ownerName,ownerId,"owner"),
        mp(m5,[4,5,6],CY,6000,"Bank Transfer","BNK0010002",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m5,[7,8,9],CY,6000,"Bank Transfer","BNK0010003",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m5,[10],  CY,2000,"Cash","",d(CY,10,5),ownerName,ownerId,"owner"),

        // ── REG-006 Shahid Iqbal — Feb→Sep paid, Oct due ───────────────────
        rp(m6, d(CY,2,1), staffName, staffId, "employee"),
        cp(m6, d(CY,2,1), staffName, staffId, "employee"),
        mp(m6,[2,3],CY,4000,"Cash","",d(CY,3,31),staffName,staffId,"employee"),
        mp(m6,[4,5,6],CY,6000,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m6,[7,8,9],CY,6000,"JazzCash","JC3300001",d(CY,9,28),staffName,staffId,"employee"),

        // ── REG-007 Kamran Butt — Feb→Oct fully paid ───────────────────────
        rp(m7, d(CY,2,10), ownerName, ownerId, "owner"),
        cp(m7, d(CY,2,10), ownerName, ownerId, "owner"),
        mp(m7,[2,3],CY,4000,"Cash","",d(CY,3,31),ownerName,ownerId,"owner"),
        mp(m7,[4,5,6],CY,6000,"Easypaisa","EP4400001",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m7,[7,8,9],CY,6000,"Cash","",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m7,[10],  CY,2000,"Cash","",d(CY,10,8),ownerName,ownerId,"owner"),

        // ── REG-008 Naeem Akhtar — Feb→Aug paid, Sep–Oct due ───────────────
        rp(m8, d(CY,2,18), staffName, staffId, "employee"),
        mp(m8,[2,3],CY,6000,"Cash","",d(CY,3,31),staffName,staffId,"employee"),
        mp(m8,[4,5,6],CY,9000,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m8,[7,8],CY,6000,"Cash","",d(CY,8,31),staffName,staffId,"employee"),

        // ── REG-009 Faisal Rehman — Mar→Oct fully paid ─────────────────────
        rp(m9, d(CY,3,5), ownerName, ownerId, "owner"),
        cp(m9, d(CY,3,5), ownerName, ownerId, "owner"),
        mp(m9,[3],   CY,2000,"Cash","",d(CY,3,31),ownerName,ownerId,"owner"),
        mp(m9,[4,5,6],CY,6000,"JazzCash","JC5500001",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m9,[7,8,9],CY,6000,"JazzCash","JC5500002",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m9,[10],  CY,2000,"Cash","",d(CY,10,1),ownerName,ownerId,"owner"),

        // ── REG-010 Yasir Mehmood — Mar→Sep paid, Oct due ──────────────────
        rp(m10, d(CY,3,12), staffName, staffId, "employee","JazzCash","JC6600001"),
        cp(m10, d(CY,3,12), staffName, staffId, "employee","JazzCash"),
        mp(m10,[3],   CY,2000,"JazzCash","JC6600002",d(CY,3,31),staffName,staffId,"employee"),
        mp(m10,[4,5,6],CY,6000,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m10,[7,8,9],CY,6000,"Easypaisa","EP5500001",d(CY,9,28),staffName,staffId,"employee"),

        // ── REG-011 Junaid Aslam — Apr→Oct fully paid ──────────────────────
        rp(m11, d(CY,4,1), ownerName, ownerId, "owner"),
        cp(m11, d(CY,4,1), ownerName, ownerId, "owner"),
        mp(m11,[4,5,6],CY,6000,"Cash","",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m11,[7,8,9],CY,6000,"Cash","",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m11,[10],  CY,2000,"Cash","",d(CY,10,3),ownerName,ownerId,"owner"),

        // ── REG-012 Imran Siddiqui — Apr→Jul paid, Aug–Oct due ─────────────
        rp(m12, d(CY,4,15), staffName, staffId, "employee"),
        mp(m12,[4,5,6],CY,7500,"Cash","",d(CY,6,30),staffName,staffId,"employee"),
        mp(m12,[7],   CY,2500,"Cash","",d(CY,7,31),staffName,staffId,"employee"),

        // ── REG-013 Adeel Hassan — May→Oct fully paid ──────────────────────
        rp(m13, d(CY,5,3), ownerName, ownerId, "owner"),
        cp(m13, d(CY,5,3), ownerName, ownerId, "owner"),
        mp(m13,[5,6],CY,4000,"Bank Transfer","BNK0020001",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m13,[7,8,9],CY,6000,"Bank Transfer","BNK0020002",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m13,[10],  CY,2000,"Cash","",d(CY,10,5),ownerName,ownerId,"owner"),

        // ── REG-014 Waqas Nawaz — May→Oct fully paid ───────────────────────
        rp(m14, d(CY,5,20), staffName, staffId, "employee","Easypaisa","EP7700001"),
        cp(m14, d(CY,5,20), staffName, staffId, "employee","Easypaisa"),
        mp(m14,[5,6],CY,3600,"Easypaisa","EP7700002",d(CY,6,30),staffName,staffId,"employee"),
        mp(m14,[7,8,9],CY,5400,"Cash","",d(CY,9,30),staffName,staffId,"employee"),
        mp(m14,[10],  CY,1800,"Cash","",d(CY,10,2),staffName,staffId,"employee"),

        // ── REG-015 Saad Farooq — Jun→Sep paid, Oct due ────────────────────
        rp(m15, d(CY,6,10), ownerName, ownerId, "owner"),
        cp(m15, d(CY,6,10), ownerName, ownerId, "owner"),
        mp(m15,[6],   CY,2000,"Cash","",d(CY,6,30),ownerName,ownerId,"owner"),
        mp(m15,[7,8,9],CY,6000,"Cash","",d(CY,9,28),ownerName,ownerId,"owner"),

        // ── REG-016 Hamid Ali — Jul→Oct fully paid ─────────────────────────
        rp(m16, d(CY,7,5), staffName, staffId, "employee"),
        cp(m16, d(CY,7,5), staffName, staffId, "employee"),
        mp(m16,[7,8,9],CY,6000,"JazzCash","JC8800001",d(CY,9,30),staffName,staffId,"employee"),
        mp(m16,[10],  CY,2000,"Cash","",d(CY,10,7),staffName,staffId,"employee"),

        // ── REG-017 Rizwan Javed — Jul→Aug paid, Sep–Oct due ───────────────
        rp(m17, d(CY,7,18), ownerName, ownerId, "owner"),
        mp(m17,[7,8],CY,4000,"Cash","",d(CY,8,31),ownerName,ownerId,"owner"),

        // ── REG-018 Salman Rauf — Aug→Oct fully paid ───────────────────────
        rp(m18, d(CY,8,1), staffName, staffId, "employee"),
        cp(m18, d(CY,8,1), staffName, staffId, "employee"),
        mp(m18,[8,9],CY,4000,"Cash","",d(CY,9,30),staffName,staffId,"employee"),
        mp(m18,[10],CY,2000,"Cash","",d(CY,10,4),staffName,staffId,"employee"),

        // ── REG-019 Asad Malik — Aug→Oct fully paid ────────────────────────
        rp(m19, d(CY,8,15), ownerName, ownerId, "owner","Bank Transfer","BNK0030001"),
        cp(m19, d(CY,8,15), ownerName, ownerId, "owner","Bank Transfer"),
        mp(m19,[8,9],CY,5000,"Bank Transfer","BNK0030002",d(CY,9,30),ownerName,ownerId,"owner"),
        mp(m19,[10],CY,2500,"Cash","",d(CY,10,6),ownerName,ownerId,"owner"),

        // ── REG-020 Noman Rasheed — Sep→Oct fully paid ─────────────────────
        rp(m20, d(CY,9,2), staffName, staffId, "employee"),
        cp(m20, d(CY,9,2), staffName, staffId, "employee"),
        mp(m20,[9],  CY,2000,"Cash","",d(CY,9,30),staffName,staffId,"employee"),
        mp(m20,[10], CY,2000,"Cash","",d(CY,10,3),staffName,staffId,"employee"),

        // ── REG-021 Omar Farhan — Sep paid, Oct due ────────────────────────
        rp(m21, d(CY,9,20), ownerName, ownerId, "owner","JazzCash","JC9900001"),
        cp(m21, d(CY,9,20), ownerName, ownerId, "owner","JazzCash"),
        mp(m21,[9],  CY,3000,"JazzCash","JC9900002",d(CY,9,30),ownerName,ownerId,"owner"),

        // ── REG-022 Danish Khalid — Oct paid (new member) ──────────────────
        rp(m22, d(CY,CM,5), staffName, staffId, "employee"),
        cp(m22, d(CY,CM,5), staffName, staffId, "employee"),
        mp(m22,[CM], CY,2000,"Cash","",d(CY,CM,5),staffName,staffId,"employee"),

        // ── REG-023 Fahad Zaman — very new, registration only (Oct fee due) ─
        rp(m23, d(CY,CM,12), ownerName, ownerId, "owner"),

        // ── REG-024 Tariq Jameel — inactive, paid Jan only ─────────────────
        rp(m24, d(CY,1,5), staffName, staffId, "employee"),
        mp(m24,[1],  CY,2000,"Cash","",d(CY,1,31),staffName,staffId,"employee"),

        // ── REG-025 Kashif Pervaiz — inactive, paid Mar–May only ───────────
        rp(m25, d(CY,3,1), ownerName, ownerId, "owner"),
        cp(m25, d(CY,3,1), ownerName, ownerId, "owner"),
        mp(m25,[3,4,5],CY,6000,"Cash","",d(CY,5,31),ownerName,ownerId,"owner"),
      ];

      for (const p of payments) {
        await db.collection("payments").add(p);
        process.stdout.write(".");
      }
      console.log(`\n✅ ${payments.length} payment records created.`);

      // ── Activity Logs ────────────────────────────────────────────────────
      console.log("📜 Adding activity logs...");
      const logs = [
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Initialized Health Gym Firestore Database", details:{gymName:"Health Gym"}, createdAt:d(CY,1,1) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Staff account created", details:{username:"staff"}, createdAt:d(CY,1,1) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Registered member Ali Raza (REG-001)", details:{regNo:"REG-001"}, createdAt:d(CY,1,3) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Registered member Usman Ghani (REG-002)", details:{regNo:"REG-002"}, createdAt:d(CY,1,7) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Received fee Rs. 6000 for Ali Raza (REG-001) [Jan–Mar 2026]", details:{}, createdAt:d(CY,3,31) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Registered member Shahid Iqbal (REG-006)", details:{regNo:"REG-006"}, createdAt:d(CY,2,1) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Registered member Kamran Butt (REG-007)", details:{regNo:"REG-007"}, createdAt:d(CY,2,10) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Registered member Faisal Rehman (REG-009)", details:{regNo:"REG-009"}, createdAt:d(CY,3,5) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Member Tariq Jameel (REG-024) marked as inactive", details:{regNo:"REG-024"}, createdAt:d(CY,4,15) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Registered member Salman Rauf (REG-018)", details:{regNo:"REG-018"}, createdAt:d(CY,8,1) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Registered member Omar Farhan (REG-021)", details:{regNo:"REG-021"}, createdAt:d(CY,9,20) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Registered member Danish Khalid (REG-022)", details:{regNo:"REG-022"}, createdAt:d(CY,CM,5) },
        { user:{id:ownerId,name:ownerName,role:"owner"}, handleBy:ownerName,
          action:"Registered member Fahad Zaman (REG-023)", details:{regNo:"REG-023"}, createdAt:d(CY,CM,12) },
        { user:{id:staffId,name:staffName,role:"employee"}, handleBy:staffName,
          action:"Member Kashif Pervaiz (REG-025) marked as inactive", details:{regNo:"REG-025"}, createdAt:d(CY,7,1) },
      ];
      for (const log of logs) {
        await db.collection("activity_logs").add(log);
      }
      console.log(`✅ ${logs.length} activity logs created.`);

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
