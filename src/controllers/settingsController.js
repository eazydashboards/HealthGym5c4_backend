import { db } from "../config/firebase.js";
import { recordActivity } from "../utils/logger.js";

const DEFAULT_SETTINGS = {
  gymName: "Health Gym",
  defaultRegistrationFee: 1000,
  defaultMonthlyFee: 2000,
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
};

export const getOrCreateSettings = async () => {
  const ref = db.collection("settings").doc("general");
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...doc.data() };
};

// GET /api/settings
export const getSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings (Owner only)
export const updateSettings = async (req, res, next) => {
  try {
    const { gymName, defaultRegistrationFee, defaultMonthlyFee, cardFee, paymentInfo } = req.body;

    const current = await getOrCreateSettings();
    const updated = {
      ...current,
      gymName: gymName ? gymName.trim() : current.gymName,
      defaultRegistrationFee:
        defaultRegistrationFee !== undefined
          ? Number(defaultRegistrationFee)
          : current.defaultRegistrationFee || 1000,
      defaultMonthlyFee:
        defaultMonthlyFee !== undefined ? Number(defaultMonthlyFee) : current.defaultMonthlyFee,
      cardFee: cardFee !== undefined ? Number(cardFee) : current.cardFee,
      paymentInfo: {
        ...current.paymentInfo,
        ...(paymentInfo || {}),
      },
      updatedAt: new Date().toISOString(),
      handleBy: req.user.name,
    };

    await db.collection("settings").doc("general").set(updated, { merge: true });

    await recordActivity(req, `Updated Health Gym settings`);

    res.json({
      success: true,
      message: "Health Gym settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    next(error);
  }
};
