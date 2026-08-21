const express = require("express");
const Vehicle = require("../models/Vehicle");
const SparePart = require("../models/SparePart");
const InventorySnapshot = require("../models/InventorySnapshot");
const StockMovement = require("../models/StockMovement");
const Branch = require("../models/Branch");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { branchFilter, COMPANY_WIDE_ROLES } = require("../middleware/branchScope");

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary?branch=
// admin/executive get a company-wide rollup by default (every branch combined),
// or one branch's numbers if they pass ?branch=. manager/employee always see
// only their own branch — the branch param is ignored for them (branchFilter
// enforces this, not this route).
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const scope = branchFilter(req.user, req.query.branch);
    const vehicleScope = { status: { $in: ["IN_STOCK", "PDI_PENDING"] }, ...scope };
    const movementScope = req.query.branch || !COMPANY_WIDE_ROLES.includes(req.user.role)
      ? { branchCode: scope.branchCode ?? req.user.branchCode }
      : {};

    const [vehicleCount, partCount, lowStockCount, recentMovements, branches] = await Promise.all([
      Vehicle.countDocuments(vehicleScope),
      SparePart.countDocuments({ isActive: true }), // catalog is company-wide, not branch-scoped
      InventorySnapshot.countDocuments({ lowStockFlag: true, ...scope }),
      StockMovement.find(Object.keys(movementScope).length ? movementScope : {})
        .sort({ timestamp: -1 })
        .limit(8)
        .populate("performedBy", "name"),
      COMPANY_WIDE_ROLES.includes(req.user.role) ? Branch.find({ isActive: true }).sort({ name: 1 }) : [],
    ]);

    res.json({
      ok: true,
      summary: {
        scope: COMPANY_WIDE_ROLES.includes(req.user.role) && !req.query.branch ? "company-wide" : (scope.branchCode ?? req.user.branchCode),
        vehiclesInStock: vehicleCount,
        activeSpareParts: partCount,
        lowStockAlerts: lowStockCount,
        recentMovements: recentMovements.map((m) => ({
          sku: m.sku,
          locationCode: m.locationCode,
          reasonCode: m.reasonCode,
          qtyDelta: m.qtyDelta,
          performedBy: m.performedBy?.name ?? "Unknown",
          timestamp: m.timestamp,
        })),
        // Only populated for admin/executive — lets the frontend offer a branch switcher.
        branches: branches.map((b) => ({ code: b.code, name: b.name })),
      },
    });
  })
);

module.exports = router;
