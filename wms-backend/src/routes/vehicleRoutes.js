const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { branchFilter, resolveWriteBranch, assertOwnBranch } = require("../middleware/branchScope");

const router = express.Router();
router.use(requireAuth);

// GET /api/vehicles?status=&modelFamily=&q=&branch=
// admin/executive see every branch (optionally narrowed with ?branch=);
// manager/employee only ever see their own branch's vehicles.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, modelFamily, q, branch } = req.query;
    const filter = { ...branchFilter(req.user, branch) };
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

// POST /api/vehicles — admin/manager/employee. Receiving a new unit is floor-level work,
// same tier as receiving spare parts stock.
router.post(
  "/",
  requireRole("admin", "manager", "employee"),
  asyncHandler(async (req, res) => {
    const branchCode = resolveWriteBranch(req.user, req.body.branchCode);
    const vehicle = await Vehicle.create({ ...req.body, branchCode });
    res.status(201).json({ ok: true, vehicle });
  })
);

// PUT /api/vehicles/:id — e.g. status changes (allocate, dispatch)
router.put(
  "/:id",
  requireRole("admin", "manager", "employee"),
  asyncHandler(async (req, res) => {
    const existing = await Vehicle.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Vehicle not found", "NOT_FOUND");
    assertOwnBranch(req.user, existing.branchCode);

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ ok: true, vehicle });
  })
);

module.exports = router;
