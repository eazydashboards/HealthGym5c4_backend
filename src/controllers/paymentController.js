import { db } from "../config/firebase.js";
import { recordActivity } from "../utils/logger.js";

// POST /api/payments
export const createPayment = async (req, res, next) => {
  try {
    const {
      memberId,
      months,
      year,
      amount,
      method,
      transactionId,
      paymentDate,
    } = req.body;

    if (!memberId || !year || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all payment details (member, year, amount, payment method).",
      });
    }

    const memberDoc = await db.collection("members").doc(memberId).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    const member = memberDoc.data();

    // Standardize months array
    let monthsArray = [];
    if (Array.isArray(months)) {
      monthsArray = months.map(Number).filter((m) => m >= 1 && m <= 12);
    } else if (months) {
      monthsArray = [Number(months)];
    }

    if (monthsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one month to pay.",
      });
    }

    // Double payment prevention: Query existing payments for this member & year
    const existingSnap = await db
      .collection("payments")
      .where("member", "==", memberId)
      .where("year", "==", Number(year))
      .where("type", "==", "monthly")
      .get();

    const alreadyPaidMonths = new Set();
    existingSnap.forEach((doc) => {
      const p = doc.data();
      if (Array.isArray(p.months)) {
        p.months.forEach((m) => {
          if (monthsArray.includes(Number(m))) {
            alreadyPaidMonths.add(Number(m));
          }
        });
      }
    });

    if (alreadyPaidMonths.size > 0) {
      const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const conflictNames = Array.from(alreadyPaidMonths).map((m) => monthNames[m]).join(", ");
      return res.status(400).json({
        success: false,
        message: `Payment already recorded for ${conflictNames} ${year}. Double payment prevented.`,
      });
    }

    const paymentData = {
      member: memberId,
      memberId: memberId,
      memberName: member.name,
      memberRegNo: member.regNo,
      type: "monthly",
      months: monthsArray,
      year: Number(year),
      amount: Number(amount),
      method,
      transactionId: transactionId ? transactionId.trim() : "",
      paymentDate: paymentDate || new Date().toISOString(),
      handleBy: req.user.name, // Explicitly tracks employee/owner who handled payment
      receivedBy: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("payments").add(paymentData);

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const paidLabel = monthsArray.map((m) => monthNames[m]).join(", ");

    await recordActivity(
      req,
      `Received fee of Rs. ${paymentData.amount} for ${member.name} (${member.regNo}) [${paidLabel} ${year}] via ${paymentData.method} [Handle by: ${req.user.name}]`
    );

    res.status(201).json({
      success: true,
      message: `Fee of Rs. ${amount} successfully recorded for ${member.name}!`,
      payment: { _id: docRef.id, id: docRef.id, ...paymentData },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments
export const getPayments = async (req, res, next) => {
  try {
    const { memberId, year, type, date, startDate, endDate } = req.query;
    let query = db.collection("payments");

    if (memberId) query = query.where("member", "==", memberId);
    if (year) query = query.where("year", "==", Number(year));
    if (type) query = query.where("type", "==", type);

    const snap = await query.get();
    let payments = [];
    snap.forEach((doc) => {
      payments.push({ _id: doc.id, id: doc.id, ...doc.data() });
    });

    // Filter by specific single date (YYYY-MM-DD)
    if (date) {
      payments = payments.filter((p) => {
        const pDateStr = (p.paymentDate || p.createdAt || "").split("T")[0];
        return pDateStr === date;
      });
    }

    // Filter by date range (startDate to endDate)
    if (startDate) {
      payments = payments.filter((p) => {
        const pDateStr = (p.paymentDate || p.createdAt || "").split("T")[0];
        return pDateStr >= startDate;
      });
    }
    if (endDate) {
      payments = payments.filter((p) => {
        const pDateStr = (p.paymentDate || p.createdAt || "").split("T")[0];
        return pDateStr <= endDate;
      });
    }

    payments.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));

    // Calculate totals for quick summary
    const totalAmount = payments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const byMethod = payments.reduce((acc, curr) => {
      const m = curr.method || "Cash";
      acc[m] = (acc[m] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      count: payments.length,
      totalAmount,
      byMethod,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/daily-summary
export const getDailyPaymentSummary = async (req, res, next) => {
  try {
    const targetDateStr = req.query.date || new Date().toISOString().split("T")[0];

    const snap = await db.collection("payments").get();
    let dayPayments = [];

    snap.forEach((doc) => {
      const p = { _id: doc.id, id: doc.id, ...doc.data() };
      const pDateStr = (p.paymentDate || p.createdAt || "").split("T")[0];
      if (pDateStr === targetDateStr) {
        dayPayments.push(p);
      }
    });

    dayPayments.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));

    const totalRevenue = dayPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const cashTotal = dayPayments
      .filter((p) => (p.method || "").toLowerCase() === "cash")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const onlineTotal = totalRevenue - cashTotal;

    const monthlyCount = dayPayments.filter((p) => p.type === "monthly").length;
    const regCount = dayPayments.filter((p) => p.type === "registration").length;
    const cardCount = dayPayments.filter((p) => p.type === "card").length;

    res.json({
      success: true,
      date: targetDateStr,
      totalRevenue,
      cashTotal,
      onlineTotal,
      totalTransactions: dayPayments.length,
      breakdown: {
        monthlyCount,
        regCount,
        cardCount,
      },
      payments: dayPayments,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/payments/:id (Owner only)
export const deletePayment = async (req, res, next) => {
  try {
    const ref = db.collection("payments").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    const pay = doc.data();
    await ref.delete();

    await recordActivity(
      req,
      `Deleted payment of Rs. ${pay.amount} for ${pay.memberName} (${pay.memberRegNo})`
    );

    res.json({ success: true, message: "Payment record removed" });
  } catch (error) {
    next(error);
  }
};
