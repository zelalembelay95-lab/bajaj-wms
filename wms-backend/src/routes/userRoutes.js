const express = require("express");
const User = require("../models/User");
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

// PUT /api/users/:id/deactivate — soft-disable instead of deleting, to keep StockMovement.performedBy valid.
router.put(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");
    res.json({ ok: true, user });
  })
);

module.exports = router;
