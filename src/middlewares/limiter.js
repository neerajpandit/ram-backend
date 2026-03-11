import rateLimit from "express-rate-limit";

const SENSITIVE_API_LIMIT_TIME_SPAN=process.env.SENSITIVE_API_LIMIT || 60000;
const SENSITIVE_API_LIMIT =process.env.SENSITIVE_API_LIMIT || 3;
const API_LIMIT_TIME_SPAN = process.env.API_LIMIT_TIME_SPAN || 60000;
const API_LIMIT = process.env.API_LIMIT || 10;

const createRateLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      res
        .status(429)
        .json({
          success: false,
          message: "Too many requests. Please try again later.",
        }),
  });
// Rate limiter middleware for general API routes
export const apiRateLimiter = () => {
  const windowMs = parseInt(API_LIMIT_TIME_SPAN, 10);
  const max = parseInt(API_LIMIT, 10);
  return createRateLimiter(windowMs, max);
};
// Rate limiter middleware for sensitive API routes
export const sensitiveApiRateLimiter = () => {
  const windowMs = parseInt(SENSITIVE_API_LIMIT_TIME_SPAN, 10);
  const max = parseInt(SENSITIVE_API_LIMIT, 10);
  return createRateLimiter(windowMs, max);
};
