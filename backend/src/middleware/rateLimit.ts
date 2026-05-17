import rateLimit from 'express-rate-limit';

// Rate limiter for login endpoint (FR: 5 attempts per 15 minutes)
export const rateLimiters = {
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
      error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many login attempts. Try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Rate limiter for booking creation (10 requests per minute)
  booking: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many booking requests',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // General rate limiter (100 requests per minute)
  general: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};
