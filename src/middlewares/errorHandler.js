// middlewares/errorHandler.js
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

export function errorHandler(err, req, res, next) {

  // CSRF Errors
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token",
    });
  }

  // JWT Authentication Errors
  if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }

  // Validation Errors (e.g., Joi, Mongoose)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: err.errors,
    });
  }

  // Rate Limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  // Default Internal Error
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
}
