const express = require("express");
const WarehouseLocation = require("../models/WarehouseLocation");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { branchFilter, resolveWriteBranch } = require("../middleware/branchScope");

const router = express.Router();
router.use(requireAuth);

// GET /api/warehouse-locations?zoneType=&branch=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { isActive: true, ...branchFilter(req.user, req.query.branch) };
    if (req.query.zoneType) filter.zoneType = req.query.zoneType;
    const locations = await WarehouseLocation.find(filter).sort({ locationCode: 1 });
    res.json({ ok: true, locations });
  })
);

// POST /api/warehouse-locations — admin only (provisioning bins is a structural decision,
// same tier as opening a branch or editing the catalog)
router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const branchCode = resolveWriteBranch(req.user, req.body.branchCode);
    const location = await WarehouseLocation.create({ ...req.body, branchCode });
    res.status(201).json({ ok: true, location });
  })
);

module.exports = router;
