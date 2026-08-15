const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  });
}

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, "Email and password are required", "BAD_REQUEST");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password", "AUTH_FAILED");

    const ok = await user.checkPassword(password);
    if (!ok) throw new ApiError(401, "Invalid email or password", "AUTH_FAILED");

    res.json({ ok: true, token: signToken(user), user });
  })
);

// GET /api/auth/me — lets the frontend confirm a stored token is still valid on page load.
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, user: req.user });
  })
);

// POST /api/auth/register — admin-only. This is the ONLY way new logins get created;
// there is no public sign-up route, on purpose, for a staff-only system.
router.post(
  "/register",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, "name, email, and password are required", "BAD_REQUEST");
    }
    if (role && !["admin", "employee"].includes(role)) {
      throw new ApiError(400, "role must be 'admin' or 'employee'", "BAD_REQUEST");
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || "employee",
    });

    res.status(201).json({ ok: true, user });
  })
);

module.exports = router;
