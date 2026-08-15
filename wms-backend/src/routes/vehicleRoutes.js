const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/vehicles?status=&modelFamily=&q=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, modelFamily, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (modelFamily) filter.modelFamily = modelFamily;
    if (q) {
      const needle = q.trim().toUpperCase();
      filter.$or = [
        { chassisNumber: new RegExp(needle, "i") },
        { engineNumber: new RegExp(needle, "i") },
        { variant: new RegExp(q.trim(), "i") },
      ];
    }
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, vehicles });
  })
);

// POST /api/vehicles — supervisor/admin only (receiving new stock)
router.post(
  "/",
  requireRole("admin", "employee"),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json({ ok: true, vehicle });
  })
);

// PUT /api/vehicles/:id — e.g. status changes (allocate, dispatch)
router.put(
  "/:id",
  requireRole("admin", "employee"),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vehicle) throw new ApiError(404, "Vehicle not found", "NOT_FOUND");
    res.json({ ok: true, vehicle });
  })
);

module.exports = router;
