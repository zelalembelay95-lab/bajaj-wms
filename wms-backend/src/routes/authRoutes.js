const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Branch = require("../models/Branch");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();

// 10 attempts per 15 minutes per IP — enough for a genuinely mistyped
// password a few times over, not enough for a brute-force script.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait a few minutes and try again.", code: "RATE_LIMITED" },
});

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  });
}

// POST /api/auth/login
router.post(
  "/login",
  loginLimiter,
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
    const { name, email, password, role, jobTitle, branchCode } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, "name, email, and password are required", "BAD_REQUEST");
    }
    if (password.length < 8) {
      throw new ApiError(400, "password must be at least 8 characters", "BAD_REQUEST");
    }
    if (role && !User.ROLES.includes(role)) {
      throw new ApiError(400, `role must be one of: ${User.ROLES.join(", ")}`, "BAD_REQUEST");
    }

    const resolvedRole = role || "employee";
    const needsBranch = User.BRANCH_SCOPED_ROLES.includes(resolvedRole);

    if (needsBranch) {
      if (!branchCode) {
        throw new ApiError(400, `branchCode is required for role "${resolvedRole}"`, "BAD_REQUEST");
      }
      const branch = await Branch.findOne({ code: branchCode.toUpperCase(), isActive: true });
      if (!branch) throw new ApiError(400, `Unknown branch code "${branchCode}"`, "BAD_BRANCH");
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: resolvedRole,
      jobTitle,
      branchCode: needsBranch ? branchCode.toUpperCase() : null,
    });

    res.status(201).json({ ok: true, user });
  })
);

// PUT /api/auth/change-password — self-service, requires the current password.
// This is how anyone (including the seeded admin) gets off the default
// ChangeMe123! password without needing another admin to reset it for them.
router.put(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "currentPassword and newPassword are required", "BAD_REQUEST");
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, "newPassword must be at least 8 characters", "BAD_REQUEST");
    }

    const ok = await req.user.checkPassword(currentPassword);
    if (!ok) throw new ApiError(401, "Current password is incorrect", "AUTH_FAILED");

    req.user.passwordHash = await User.hashPassword(newPassword);
    await req.user.save();

    res.json({ ok: true });
  })
);

module.exports = router;
