const rateLimit = require("express-rate-limit");

// Middleware محدودکننده درخواست برای لاگین با پنجره ۵ دقیقه
const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ۵ دقیقه
  max: 5, // حداکثر ۵ درخواست در ۵ دقیقه
  message: {
    status: 429,
    error:
      "تعداد درخواست‌های شما زیاد است، لطفا ۵ دقیقه بعد دوباره امتحان کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginRateLimiter;
