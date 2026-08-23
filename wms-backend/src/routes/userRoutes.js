const express = require("express");
const User = require("../models/User");
const Branch = require("../models/Branch");
const StockMovement = require("../models/StockMovement");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// GET /api/users?branch=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.branch) filter.branchCode = req.query.branch.toUpperCase();
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ ok: true, users });
  })
);

// PUT /api/users/:id — edit name, email, role, branch, job title. Password is NOT
// editable here — see /reset-password below, kept separate so it's a deliberate,
// auditable action rather than a field that can be silently changed in a bigger edit.
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, email, role, jobTitle, branchCode } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");

    if (role && !User.ROLES.includes(role)) {
      throw new ApiError(400, `role must be one of: ${User.ROLES.join(", ")}`, "BAD_REQUEST");
    }

    const nextRole = role || user.role;
    const needsBranch = User.BRANCH_SCOPED_ROLES.includes(nextRole);
    if (needsBranch) {
      const resolvedBranch = (branchCode || user.branchCode || "").toUpperCase();
      if (!resolvedBranch) throw new ApiError(400, `branchCode is required for role "${nextRole}"`, "BAD_REQUEST");
      const branch = await Branch.findOne({ code: resolvedBranch, isActive: true });
      if (!branch) throw new ApiError(400, `Unknown branch code "${resolvedBranch}"`, "BAD_BRANCH");
      user.branchCode = resolvedBranch;
    } else {
      user.branchCode = null;
    }

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;

    await user.save();
    res.json({ ok: true, user });
  })
);

// PUT /api/users/:id/reset-password — admin sets a new temporary password for someone
// (e.g. they forgot theirs). There's no self-service "forgot password" flow yet, so
// this is the only recovery path — the admin should hand the new password to that
// person out-of-band (in person, phone), not over an insecure channel.
router.put(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      throw new ApiError(400, "newPassword must be at least 8 characters", "BAD_REQUEST");
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    res.json({ ok: true, user });
  })
);

// PUT /api/users/:id/deactivate — soft-disable: blocks login immediately, keeps
// StockMovement.performedBy references intact for the audit trail.
router.put(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");
    res.json({ ok: true, user });
  })
);

// PUT /api/users/:id/reactivate — undo a deactivation
router.put(
  "/:id/reactivate",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");
    res.json({ ok: true, user });
  })
);

// DELETE /api/users/:id — permanent removal. Blocked if this user has any stock
// movement history, since StockMovement.performedBy is required and used for the
// audit trail — deleting the user would either orphan that reference or falsify
// history. Use /deactivate instead for anyone who's ever actually used the system;
// this is really only for a login created by mistake that was never used.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");

    const movementCount = await StockMovement.countDocuments({ performedBy: user._id });
    if (movementCount > 0) {
      throw new ApiError(
        409,
        `This user has ${movementCount} recorded stock movement(s) — deleting them would break the audit trail. Deactivate instead.`,
        "HAS_HISTORY"
      );
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true, deleted: true });
  })
);

module.exports = router;
