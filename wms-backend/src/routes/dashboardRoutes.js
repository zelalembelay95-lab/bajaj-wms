const express = require("express");
const Vehicle = require("../models/Vehicle");
const SparePart = require("../models/SparePart");
const InventorySnapshot = require("../models/InventorySnapshot");
const StockMovement = require("../models/StockMovement");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const [vehicleCount, partCount, lowStockCount, recentMovements] = await Promise.all([
      Vehicle.countDocuments({ status: { $in: ["IN_STOCK", "PDI_PENDING"] } }),
      SparePart.countDocuments({ isActive: true }),
      InventorySnapshot.countDocuments({ lowStockFlag: true }),
      StockMovement.find().sort({ timestamp: -1 }).limit(8).populate("performedBy", "name"),
    ]);

    res.json({
      ok: true,
      summary: {
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
      },
    });
  })
);

module.exports = router;
