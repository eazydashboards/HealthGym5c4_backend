import { db } from "../config/firebase.js";
import { recordActivity } from "../utils/logger.js";
import { getOrCreateSettings } from "./settingsController.js";

// Helper to calculate unpaid months for a member
export const calculateMemberDues = (
  member,
  payments,
  targetYear = new Date().getFullYear(),
  targetMonth = new Date().getMonth() + 1
) => {
  const joining = new Date(member.joiningDate || member.createdAt);
  const joinYear = joining.getFullYear();
  const joinMonth = joining.getMonth() + 1;

  // Paid months for targetYear
  const paidMonthsInYear = new Set();
  payments
    .filter((p) => p.type === "monthly" && Number(p.year) === Number(targetYear))
    .forEach((p) => {
      if (Array.isArray(p.months)) {
        p.months.forEach((m) => paidMonthsInYear.add(Number(m)));
      }
    });

  // Calculate unpaid months up to current targetMonth
  const unpaidMonths = [];
  const startM = targetYear === joinYear ? joinMonth : 1;
  const endM = targetMonth;

  for (let m = startM; m <= endM; m++) {
    if (!paidMonthsInYear.has(m)) {
      unpaidMonths.push(m);
    }
  }

  const isCurrentMonthPaid = paidMonthsInYear.has(targetMonth);

  return {
    isCurrentMonthPaid,
    unpaidMonths,
    unpaidCount: unpaidMonths.length,
    totalDue: unpaidMonths.length * (Number(member.monthlyFee) || 0),
  };
};

// GET /api/members/next-reg
export const getNextRegNo = async (req, res, next) => {
  try {
    const snap = await db.collection("members").get();
    let maxNum = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      if (data.regNo) {
        const match = data.regNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const nextReg = `REG-${String(maxNum + 1).padStart(3, "0")}`;
    res.json({ success: true, nextReg });
  } catch (error) {
    next(error);
  }
};

// POST /api/members
export const createMember = async (req, res, next) => {
  try {
    const {
      name,
      regNo,
      joiningDate,
      fatherName,
      address,
      mobile,
      monthlyFee,
      registrationFee,
      registrationPaymentMethod,
      registrationTransactionId,
      cardIssued,
      cardPaymentMethod,
      cardTransactionId,
    } = req.body;

    if (!name || !regNo || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields: Name, REG, and Mobile Number",
      });
    }

    const cleanRegNo = regNo.trim().toUpperCase();

    // Check unique REG in Firestore
    const existingSnap = await db
      .collection("members")
      .where("regNo", "==", cleanRegNo)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      return res.status(400).json({
        success: false,
        message: `Registration number "${cleanRegNo}" is already assigned to ${existing.name}.`,
      });
    }

    const settings = await getOrCreateSettings();
    let fee = Number(monthlyFee);
    if (isNaN(fee) || fee <= 0) {
      fee = settings.defaultMonthlyFee || 2000;
    }

    let regFee = Number(registrationFee);
    if (isNaN(regFee)) {
      regFee = settings.defaultRegistrationFee !== undefined ? Number(settings.defaultRegistrationFee) : 1000;
    }

    const memberData = {
      name: name.trim(),
      regNo: cleanRegNo,
      joiningDate: joiningDate || new Date().toISOString(),
      fatherName: fatherName ? fatherName.trim() : "",
      address: address ? address.trim() : "",
      mobile: mobile.trim(),
      monthlyFee: fee,
      registrationFee: regFee,
      cardIssued: Boolean(cardIssued),
      cardIssuedDate: cardIssued ? new Date().toISOString() : null,
      status: "active",
      handleBy: req.user.name,
      addedBy: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("members").add(memberData);
    const createdMember = { _id: docRef.id, id: docRef.id, ...memberData };

    // Record Registration Fee Payment in Firestore
    if (regFee > 0) {
      await db.collection("payments").add({
        member: docRef.id,
        memberId: docRef.id,
        memberName: createdMember.name,
        memberRegNo: createdMember.regNo,
        type: "registration",
        amount: regFee,
        year: new Date().getFullYear(),
        method: registrationPaymentMethod || "Cash",
        transactionId: registrationTransactionId || "",
        paymentDate: new Date().toISOString(),
        handleBy: req.user.name,
        receivedBy: {
          id: req.user._id || req.user.id,
          name: req.user.name,
          role: req.user.role,
        },
        createdAt: new Date().toISOString(),
      });
    }

    // Note: First membership card at admission is 100% FREE!
    // No card fee payment is charged upon initial registration.
    // Replacement/reissue for lost cards is charged (Rs. 100) via member profile.

    await recordActivity(
      req,
      `Registered member: ${createdMember.name} (${createdMember.regNo})${cardIssued ? " [First Gym Card Issued FREE]" : ""}`,
      { memberId: docRef.id, regNo: cleanRegNo, handleBy: req.user.name }
    );

    res.status(201).json({
      success: true,
      message: `Member ${createdMember.name} registered successfully!`,
      member: createdMember,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/members
export const getMembers = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const snap = await db.collection("members").get();

    let members = [];
    snap.forEach((doc) => {
      members.push({ _id: doc.id, id: doc.id, ...doc.data() });
    });

    // Filter by status if specified
    if (status) {
      members = members.filter((m) => m.status === status);
    }

    // Filter by search query (Name, REG, Phone, Father Name)
    if (q && q.trim()) {
      const query = q.trim().toLowerCase();
      members = members.filter((m) => {
        return (
          (m.name && m.name.toLowerCase().includes(query)) ||
          (m.regNo && m.regNo.toLowerCase().includes(query)) ||
          (m.mobile && m.mobile.toLowerCase().includes(query)) ||
          (m.fatherName && m.fatherName.toLowerCase().includes(query)) ||
          (m.address && m.address.toLowerCase().includes(query))
        );
      });
    }

    // Sort newest first
    members.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Fetch payments for dues calculations
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const paySnap = await db
      .collection("payments")
      .where("year", "==", currentYear)
      .where("type", "==", "monthly")
      .get();

    const paymentsByMember = {};
    paySnap.forEach((doc) => {
      const p = doc.data();
      const mId = p.member || p.memberId;
      if (!paymentsByMember[mId]) paymentsByMember[mId] = [];
      paymentsByMember[mId].push(p);
    });

    const enrichedMembers = members.map((m) => {
      const mPayments = paymentsByMember[m._id] || paymentsByMember[m.id] || [];
      const dues = calculateMemberDues(m, mPayments, currentYear, currentMonth);
      return {
        ...m,
        isCurrentMonthPaid: dues.isCurrentMonthPaid,
        totalDue: dues.totalDue,
        unpaidCount: dues.unpaidCount,
      };
    });

    res.json({
      success: true,
      count: enrichedMembers.length,
      members: enrichedMembers,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/members/:id
export const getMemberById = async (req, res, next) => {
  try {
    const doc = await db.collection("members").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = { _id: doc.id, id: doc.id, ...doc.data() };
    const targetYear = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

    // Fetch payments for this member
    const paySnap = await db
      .collection("payments")
      .where("member", "==", member._id)
      .get();

    let payments = [];
    paySnap.forEach((pDoc) => {
      payments.push({ _id: pDoc.id, id: pDoc.id, ...pDoc.data() });
    });

    // Also check if stored with memberId
    if (payments.length === 0) {
      const paySnap2 = await db
        .collection("payments")
        .where("memberId", "==", member._id)
        .get();
      paySnap2.forEach((pDoc) => {
        payments.push({ _id: pDoc.id, id: pDoc.id, ...pDoc.data() });
      });
    }

    // Sort payments newest first
    payments.sort(
      (a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt)
    );

    const dues = calculateMemberDues(
      member,
      payments,
      targetYear,
      targetYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12
    );

    res.json({
      success: true,
      member,
      dues,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/members/:id
export const updateMember = async (req, res, next) => {
  try {
    const { name, fatherName, address, mobile, monthlyFee, status, joiningDate } = req.body;
    const ref = db.collection("members").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const current = doc.data();
    const updateData = {
      name: name ? name.trim() : current.name,
      fatherName: fatherName !== undefined ? fatherName.trim() : current.fatherName,
      address: address !== undefined ? address.trim() : current.address,
      mobile: mobile ? mobile.trim() : current.mobile,
      monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : current.monthlyFee,
      status: status || current.status,
      joiningDate: joiningDate || current.joiningDate,
      handleBy: req.user.name,
      updatedAt: new Date().toISOString(),
    };

    await ref.update(updateData);

    await recordActivity(
      req,
      `Updated member profile: ${updateData.name} (${current.regNo}) [Handle by: ${req.user.name}]`
    );

    res.json({
      success: true,
      message: "Member updated successfully",
      member: { _id: doc.id, id: doc.id, ...current, ...updateData },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/members/:id (Owner Only)
export const deleteMember = async (req, res, next) => {
  try {
    const ref = db.collection("members").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = doc.data();

    // Delete associated payments in Firestore
    const paySnap = await db
      .collection("payments")
      .where("member", "==", doc.id)
      .get();
    const batch = db.batch();
    paySnap.forEach((p) => batch.delete(p.ref));
    await batch.commit();

    await ref.delete();

    await recordActivity(req, `Deleted member: ${member.name} (${member.regNo})`);

    res.json({
      success: true,
      message: `Member ${member.name} deleted successfully from Health Gym`,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/members/:id/toggle-card
export const toggleCard = async (req, res, next) => {
  try {
    const { cardIssued, paymentMethod, transactionId } = req.body;
    const ref = db.collection("members").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = doc.data();

    if (cardIssued) {
      const settings = await getOrCreateSettings();
      const cardFee = settings.cardFee || 100;

      await ref.update({
        cardIssued: true,
        cardIssuedDate: new Date().toISOString(),
        handleBy: req.user.name,
        updatedAt: new Date().toISOString(),
      });

      // Record payment
      const payRef = await db.collection("payments").add({
        member: doc.id,
        memberId: doc.id,
        memberName: member.name,
        memberRegNo: member.regNo,
        type: "card",
        amount: cardFee,
        year: new Date().getFullYear(),
        method: paymentMethod || "Cash",
        transactionId: transactionId || "",
        paymentDate: new Date().toISOString(),
        handleBy: req.user.name,
        receivedBy: {
          id: req.user._id || req.user.id,
          name: req.user.name,
          role: req.user.role,
        },
        createdAt: new Date().toISOString(),
      });

      await recordActivity(
        req,
        `Issued card to ${member.name} (${member.regNo}) - Fee Rs. ${cardFee} [Handle by: ${req.user.name}]`
      );

      return res.json({
        success: true,
        message: `Card issued to ${member.name}. Payment of Rs. ${cardFee} recorded.`,
      });
    } else {
      await ref.update({
        cardIssued: false,
        cardIssuedDate: null,
        handleBy: req.user.name,
        updatedAt: new Date().toISOString(),
      });

      await recordActivity(req, `Revoked card for ${member.name} [Handle by: ${req.user.name}]`);

      return res.json({
        success: true,
        message: `Card status revoked for ${member.name}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/members/pending-fees
export const getPendingFees = async (req, res, next) => {
  try {
    const { filter = "current" } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const snap = await db
      .collection("members")
      .where("status", "==", "active")
      .get();

    let members = [];
    snap.forEach((d) => members.push({ _id: d.id, id: d.id, ...d.data() }));

    // Fetch this year payments
    const paySnap = await db
      .collection("payments")
      .where("year", "==", currentYear)
      .where("type", "==", "monthly")
      .get();

    const paymentsByMember = {};
    paySnap.forEach((d) => {
      const p = d.data();
      const mId = p.member || p.memberId;
      if (!paymentsByMember[mId]) paymentsByMember[mId] = [];
      paymentsByMember[mId].push(p);
    });

    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const defaulters = [];

    members.forEach((member) => {
      const mPayments = paymentsByMember[member._id] || paymentsByMember[member.id] || [];
      const dues = calculateMemberDues(member, mPayments, currentYear, currentMonth);

      if (filter === "current") {
        if (!dues.isCurrentMonthPaid) {
          defaulters.push({
            _id: member._id,
            id: member._id,
            name: member.name,
            regNo: member.regNo,
            mobile: member.mobile,
            monthlyFee: member.monthlyFee,
            dueMonths: dues.unpaidMonths.map((m) => monthNames[m]),
            dueMonthNumbers: dues.unpaidMonths,
            totalDue: dues.totalDue,
            handleBy: member.handleBy || member.addedBy?.name || "Staff",
            currentMonthName: monthNames[currentMonth],
          });
        }
      } else {
        if (dues.unpaidMonths.length > 0) {
          defaulters.push({
            _id: member._id,
            id: member._id,
            name: member.name,
            regNo: member.regNo,
            mobile: member.mobile,
            monthlyFee: member.monthlyFee,
            dueMonths: dues.unpaidMonths.map((m) => monthNames[m]),
            dueMonthNumbers: dues.unpaidMonths,
            totalDue: dues.totalDue,
            handleBy: member.handleBy || member.addedBy?.name || "Staff",
            currentMonthName: monthNames[currentMonth],
          });
        }
      }
    });

    res.json({
      success: true,
      filter,
      currentMonth: monthNames[currentMonth],
      count: defaulters.length,
      totalPendingAmount: defaulters.reduce((acc, d) => acc + d.totalDue, 0),
      defaulters,
    });
  } catch (error) {
    next(error);
  }
};
