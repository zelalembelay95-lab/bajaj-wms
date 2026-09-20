const express = require("express");
const Branch = require("../models/Branch");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/branches — every role needs this list (for forms, nav, executive drill-down)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    res.json({ ok: true, branches });
  })
);

// POST /api/branches — admin only: opening a new branch is a company-structure decision
router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const branch = await Branch.create(req.body);
    res.status(201).json({ ok: true, branch });
  })
);

module.exports = router;
