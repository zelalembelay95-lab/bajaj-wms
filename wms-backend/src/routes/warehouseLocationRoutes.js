const express = require("express");
const WarehouseLocation = require("../models/WarehouseLocation");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/warehouse-locations?zoneType=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { isActive: true };
    if (req.query.zoneType) filter.zoneType = req.query.zoneType;
    const locations = await WarehouseLocation.find(filter).sort({ locationCode: 1 });
    res.json({ ok: true, locations });
  })
);

// POST /api/warehouse-locations — admin only (provisioning new bins)
router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const location = await WarehouseLocation.create(req.body);
    res.status(201).json({ ok: true, location });
  })
);

module.exports = router;
