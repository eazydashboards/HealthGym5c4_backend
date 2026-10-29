// Lightweight in-memory rate limiter for sensitive endpoints (e.g. /login)
const loginAttempts = new Map();

// Clean up expired records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (now - record.firstAttempt > record.windowMs) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export const loginRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = options.maxAttempts || 10; // max 10 failed/total attempts per window

  return (req, res, next) => {
    // Determine client identifier
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    const record = loginAttempts.get(clientIp);

    if (!record) {
      loginAttempts.set(clientIp, {
        attempts: 1,
        firstAttempt: now,
        windowMs,
      });
      return next();
    }

    // If window expired, reset
    if (now - record.firstAttempt > windowMs) {
      loginAttempts.set(clientIp, {
        attempts: 1,
        firstAttempt: now,
        windowMs,
      });
      return next();
    }

    record.attempts += 1;

    if (record.attempts > maxAttempts) {
      const waitMinutes = Math.ceil((record.windowMs - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many login attempts from this device. Please wait ${waitMinutes} minute(s) before trying again.`,
      });
    }

    next();
  };
};
