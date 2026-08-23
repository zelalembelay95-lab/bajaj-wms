function errorHandler(err, req, res, _next) {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message, code: "VALIDATION_ERROR" });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: `A record with this ${field} already exists`, code: "DUPLICATE_KEY" });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}

class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Wraps an async route handler so thrown errors reach errorHandler instead of hanging the request. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, ApiError, asyncHandler };
