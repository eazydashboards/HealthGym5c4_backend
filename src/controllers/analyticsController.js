import { db } from "../config/firebase.js";

// GET /api/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const queryYear = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
    const queryMonth = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1; // 1-12

    // 1. Fetch all members from Firestore
    const memberSnap = await db.collection("members").get();
    let allMembers = [];
    memberSnap.forEach((doc) => {
      allMembers.push({ _id: doc.id, id: doc.id, ...doc.data() });
    });

    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter((m) => m.status === "active").length;

    // 2. New Members this month
    const startOfMonth = new Date(queryYear, queryMonth - 1, 1);
    const endOfMonth = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);

    const newMembersThisMonthList = allMembers.filter((m) => {
      const d = new Date(m.joiningDate || m.createdAt);
      return d >= startOfMonth && d <= endOfMonth;
    });

    // 3. Fetch all payments from Firestore
    const paymentSnap = await db.collection("payments").get();
    let allPayments = [];
    paymentSnap.forEach((doc) => {
      allPayments.push({ _id: doc.id, id: doc.id, ...doc.data() });
    });

    // Monthly Fee Revenue this queried month & year
    let monthlyFeeRevenue = 0;
    const thisMonthPaidPayments = [];

    allPayments.forEach((p) => {
      if (
        p.type === "monthly" &&
        Number(p.year) === queryYear &&
        Array.isArray(p.months) &&
        p.months.includes(queryMonth)
      ) {
        const monthCount = p.months.length || 1;
        monthlyFeeRevenue += Math.round((Number(p.amount) || 0) / monthCount);
        thisMonthPaidPayments.push(p);
      }
    });

    // Card Revenue this month
    let cardRevenue = 0;
    allPayments.forEach((p) => {
      if (p.type === "card") {
        const pDate = new Date(p.paymentDate || p.createdAt);
        if (pDate >= startOfMonth && pDate <= endOfMonth) {
          cardRevenue += Number(p.amount) || 0;
        }
      }
    });

    // Registration Fee Revenue this month
    let registrationRevenue = 0;
    allPayments.forEach((p) => {
      if (p.type === "registration") {
        const pDate = new Date(p.paymentDate || p.createdAt);
        if (pDate >= startOfMonth && pDate <= endOfMonth) {
          registrationRevenue += Number(p.amount) || 0;
        }
      }
    });

    const totalRevenueThisMonth = monthlyFeeRevenue + cardRevenue + registrationRevenue;

    // Total Overall Lifetime Revenue breakdowns
    let totalRevenueOverall = 0;
    let overallMonthlyRevenue = 0;
    let overallRegistrationRevenue = 0;
    let overallCardRevenue = 0;

    allPayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      totalRevenueOverall += amt;
      if (p.type === "monthly") {
        overallMonthlyRevenue += amt;
      } else if (p.type === "registration") {
        overallRegistrationRevenue += amt;
      } else if (p.type === "card") {
        overallCardRevenue += amt;
      }
    });

    // Queried Year Totals
    let yearTotalRevenue = 0;
    let yearMonthlyRevenue = 0;
    let yearRegistrationRevenue = 0;
    let yearCardRevenue = 0;

    allPayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const pYear = p.year ? Number(p.year) : new Date(p.paymentDate || p.createdAt).getFullYear();
      if (pYear === queryYear) {
        yearTotalRevenue += amt;
        if (p.type === "monthly") yearMonthlyRevenue += amt;
        else if (p.type === "registration") yearRegistrationRevenue += amt;
        else if (p.type === "card") yearCardRevenue += amt;
      }
    });

    // Revenue by payment method
    const methods = ["Cash", "Easypaisa", "JazzCash", "Bank Transfer", "Other Online"];
    const methodTotals = { Cash: 0, Easypaisa: 0, JazzCash: 0, "Bank Transfer": 0, "Other Online": 0 };

    allPayments.forEach((p) => {
      const pDate = new Date(p.paymentDate || p.createdAt);
      const isMonthlyMatch = p.type === "monthly" && Number(p.year) === queryYear && p.months?.includes(queryMonth);
      const isOtherMatch = (p.type === "card" || p.type === "registration") && pDate >= startOfMonth && pDate <= endOfMonth;

      if (isMonthlyMatch || isOtherMatch) {
        const m = p.method || "Cash";
        let amt = Number(p.amount) || 0;
        if (isMonthlyMatch && Array.isArray(p.months) && p.months.length > 1) {
          amt = Math.round(amt / p.months.length);
        }

        if (methodTotals[m] !== undefined) {
          methodTotals[m] += amt;
        } else {
          methodTotals["Other Online"] += amt;
        }
      }
    });

    const revenueByMethod = methods.map((m) => ({
      method: m,
      total: methodTotals[m] || 0,
    }));

    // Paid vs Pending Members list for queried month
    const paidMemberIds = new Set(thisMonthPaidPayments.map((p) => p.member || p.memberId));
    const paidMembersList = [];
    const pendingMembersList = [];
    let totalPendingAmount = 0;

    allMembers
      .filter((m) => m.status === "active")
      .forEach((m) => {
        const join = new Date(m.joiningDate || m.createdAt);
        if (join <= endOfMonth) {
          if (paidMemberIds.has(m._id) || paidMemberIds.has(m.id)) {
            const payRec = thisMonthPaidPayments.find(
              (p) => p.member === m._id || p.memberId === m._id
            );
            paidMembersList.push({
              _id: m._id,
              id: m._id,
              name: m.name,
              regNo: m.regNo,
              mobile: m.mobile,
              amount: payRec ? payRec.amount : m.monthlyFee,
              method: payRec ? payRec.method : "Cash",
              handleBy: payRec?.handleBy || payRec?.receivedBy?.name || "Staff",
            });
          } else {
            pendingMembersList.push({
              _id: m._id,
              id: m._id,
              name: m.name,
              regNo: m.regNo,
              mobile: m.mobile,
              monthlyFee: m.monthlyFee,
              handleBy: m.handleBy || m.addedBy?.name || "Staff",
            });
            totalPendingAmount += Number(m.monthlyFee) || 0;
          }
        }
      });

    // 12-Month trends for queried year
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrends = [];

    for (let m = 1; m <= 12; m++) {
      const mStart = new Date(queryYear, m - 1, 1);
      const mEnd = new Date(queryYear, m, 0, 23, 59, 59, 999);

      let rev = 0;
      allPayments.forEach((p) => {
        if (p.type === "monthly" && Number(p.year) === queryYear && p.months?.includes(m)) {
          const mCount = Array.isArray(p.months) && p.months.length > 1 ? p.months.length : 1;
          rev += Math.round((Number(p.amount) || 0) / mCount);
        } else if (p.type === "card" || p.type === "registration") {
          const pD = new Date(p.paymentDate || p.createdAt);
          if (pD >= mStart && pD <= mEnd) rev += Number(p.amount) || 0;
        }
      });

      const newM = allMembers.filter((mem) => {
        const jD = new Date(mem.joiningDate || mem.createdAt);
        return jD >= mStart && jD <= mEnd;
      }).length;

      monthlyTrends.push({
        monthName: monthNamesShort[m - 1],
        monthIndex: m,
        revenue: rev,
        newMembers: newM,
      });
    }

    // Today's revenue and collection count calculation
    const todayDateStr = now.toISOString().split("T")[0];
    let todayRevenue = 0;
    let todayCash = 0;
    let todayOnline = 0;
    let todayPaymentsCount = 0;

    allPayments.forEach((p) => {
      const pDateStr = (p.paymentDate || p.createdAt || "").split("T")[0];
      if (pDateStr === todayDateStr) {
        const amt = Number(p.amount) || 0;
        todayRevenue += amt;
        todayPaymentsCount += 1;
        if ((p.method || "").toLowerCase() === "cash") {
          todayCash += amt;
        } else {
          todayOnline += amt;
        }
      }
    });

    res.json({
      success: true,
      selectedYear: queryYear,
      selectedMonth: queryMonth,
      summary: {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        newMembersCount: newMembersThisMonthList.length,
        // Today's metrics
        todayRevenue,
        todayCash,
        todayOnline,
        todayPaymentsCount,
        // Monthly queried stats
        monthlyFeeRevenue,
        cardRevenue,
        registrationRevenue,
        totalRevenueThisMonth,
        totalPendingAmount,
        paidCount: paidMembersList.length,
        pendingCount: pendingMembersList.length,
        // Overall lifetime stats
        totalRevenueOverall,
        overallMonthlyRevenue,
        overallRegistrationRevenue,
        overallCardRevenue,
        overallPaymentsCount: allPayments.length,
        // Queried year stats
        yearTotalRevenue,
        yearMonthlyRevenue,
        yearRegistrationRevenue,
        yearCardRevenue,
      },
      newMembersThisMonthList,
      paidMembersList,
      pendingMembersList,
      revenueByMethod,
      monthlyTrends,
    });
  } catch (error) {
    next(error);
  }
};
