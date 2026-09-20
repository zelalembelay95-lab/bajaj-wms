const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Verifies the Bearer token and attaches the user to req.user. */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: "Missing Authorization: Bearer <token> header", code: "AUTH_MISSING" });
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Account not found or disabled", code: "AUTH_INVALID_USER" });
    }
    req.user = user;
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "AUTH_EXPIRED" : "AUTH_INVALID_TOKEN";
    return res.status(401).json({ error: "Invalid or expired session — please log in again", code });
  }
}

/** Restricts a route to specific roles. Use after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `This action requires one of these roles: ${roles.join(", ")}`,
        code: "AUTH_FORBIDDEN",
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
