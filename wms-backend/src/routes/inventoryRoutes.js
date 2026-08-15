const express = require("express");
const mongoose = require("mongoose");
const SparePart = require("../models/SparePart");
const WarehouseLocation = require("../models/WarehouseLocation");
const InventorySnapshot = require("../models/InventorySnapshot");
const StockMovement = require("../models/StockMovement");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

function normalize(raw) {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** Finds an active bin matching the part's default zone/category with spare capacity. */
async function assignBin(part) {
  const candidates = await WarehouseLocation.find({ zoneType: part.defaultZoneType, isActive: true }).limit(20);
  for (const loc of candidates) {
    if (loc.allowedCategory && loc.allowedCategory !== part.category) continue;
    const existing = await InventorySnapshot.findOne({ sku: part.sku, locationCode: loc.locationCode });
    const currentQty = existing?.totalQty ?? 0;
    if (currentQty < loc.capacity.maxUnits) return loc;
  }
  return null;
}

// -----------------------------------------------------------------------
// POST /api/inventory/receive — inbound shipments
// -----------------------------------------------------------------------
router.post(
  "/receive",
  requireRole("admin", "employee"),
  asyncHandler(async (req, res) => {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "`items` must be a non-empty array", "BAD_REQUEST");
    }
    if (items.length > 200) throw new ApiError(400, "Max 200 lines per batch", "BATCH_TOO_LARGE");

    const results = [];
    for (const line of items) {
      results.push(await receiveOneLine(line, req.user));
    }
    res.json({ ok: true, results });
  })
);

async function receiveOneLine(line, user) {
  if (!line.oemPartNumber || !line.qty || line.qty <= 0) {
    return { oemPartNumber: line.oemPartNumber ?? "", status: "ERROR", message: "oemPartNumber and a positive qty are required" };
  }

  const normalized = normalize(line.oemPartNumber);
  const part = await SparePart.findOne({ normalizedPartNumbers: normalized, isActive: true });
  if (!part) {
    return {
      oemPartNumber: line.oemPartNumber,
      status: "UNKNOWN_PART_NUMBER",
      message: `No catalog entry found for OEM part number "${line.oemPartNumber}".`,
    };
  }

  let location;
  if (line.locationCode) {
    location = await WarehouseLocation.findOne({ locationCode: normalize(line.locationCode) });
    if (!location) {
      return { oemPartNumber: line.oemPartNumber, sku: part.sku, status: "ERROR", message: `Location ${line.locationCode} not found` };
    }
  } else {
    location = await assignBin(part);
  }
  if (!location) {
    return {
      oemPartNumber: line.oemPartNumber,
      sku: part.sku,
      status: "NO_BIN_AVAILABLE",
      message: `No active ${part.defaultZoneType} bin with spare capacity for "${part.category}". Provision a new bin.`,
    };
  }

  const session = await mongoose.startSession();
  try {
    let snapshot;
    await session.withTransaction(async () => {
      const existing = await InventorySnapshot.findOne({ sku: part.sku, locationCode: location.locationCode }).session(session);

      const prevTotal = existing?.totalQty ?? 0;
      const prevAllocated = existing?.allocatedQty ?? 0;
      const prevQuarantined = existing?.quarantinedQty ?? 0;
      const reorderPolicy = existing?.reorderPolicy ?? part.reorderPolicy;

      const newTotal = prevTotal + line.qty;
      const newAvailable = newTotal - prevAllocated - prevQuarantined;
      const lowStockFlag = newAvailable <= reorderPolicy.minThreshold;

      snapshot = await InventorySnapshot.findOneAndUpdate(
        { sku: part.sku, locationCode: location.locationCode },
        {
          sku: part.sku,
          locationCode: location.locationCode,
          partSnapshot: {
            oemPartNumber: part.oemPartNumber,
            partName: part.partName,
            category: part.category,
            unitOfMeasure: part.unitOfMeasure,
            isHeavy: part.dimensions.isHeavy,
          },
          locationSnapshot: { zoneType: location.zoneType, displayLabel: location.displayLabel },
          totalQty: newTotal,
          allocatedQty: prevAllocated,
          availableQty: newAvailable,
          quarantinedQty: prevQuarantined,
          reorderPolicy,
          lowStockFlag,
          lastMovementAt: new Date(),
          lastMovementReason: "PURCHASE_RECEIPT",
        },
        { upsert: true, new: true, session }
      );

      await StockMovement.create(
        [
          {
            snapshotId: snapshot._id,
            sku: part.sku,
            locationCode: location.locationCode,
            reasonCode: "PURCHASE_RECEIPT",
            qtyDelta: line.qty,
            totalQtyAfter: newTotal,
            availableQtyAfter: newAvailable,
            performedBy: user._id,
          },
        ],
        { session }
      );
    });

    return {
      oemPartNumber: line.oemPartNumber,
      sku: part.sku,
      qtyReceived: line.qty,
      locationCode: location.locationCode,
      newTotalQty: snapshot.totalQty,
      newAvailableQty: snapshot.availableQty,
      lowStockFlag: snapshot.lowStockFlag,
      status: "OK",
    };
  } finally {
    session.endSession();
  }
}

// -----------------------------------------------------------------------
// PUT /api/inventory/stock-adjust — explicit stock-in/out with audit log
// -----------------------------------------------------------------------
const ADJUSTMENT_REASON_CODES = ["CYCLE_COUNT_ADJUSTMENT", "DAMAGE_WRITE_OFF", "RETURN_TO_STOCK", "TRANSFER_IN", "TRANSFER_OUT"];

router.put(
  "/stock-adjust",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { sku, locationCode, qtyDelta, reasonCode, notes } = req.body;

    if (!sku || !locationCode) throw new ApiError(400, "`sku` and `locationCode` are required", "BAD_REQUEST");
    if (typeof qtyDelta !== "number" || qtyDelta === 0 || !Number.isInteger(qtyDelta)) {
      throw new ApiError(400, "`qtyDelta` must be a non-zero integer", "BAD_REQUEST");
    }
    if (!ADJUSTMENT_REASON_CODES.includes(reasonCode)) {
      throw new ApiError(400, `reasonCode must be one of: ${ADJUSTMENT_REASON_CODES.join(", ")}`, "BAD_REASON_CODE");
    }

    const session = await mongoose.startSession();
    let response;
    try {
      await session.withTransaction(async () => {
        const snap = await InventorySnapshot.findOne({ sku: normalize(sku), locationCode: normalize(locationCode) }).session(session);
        if (!snap) throw new ApiError(404, `No inventory snapshot for SKU "${sku}" at "${locationCode}"`, "SNAPSHOT_NOT_FOUND");

        const totalQtyAfter = snap.totalQty + qtyDelta;
        if (totalQtyAfter < 0) throw new ApiError(409, `Adjustment would drive totalQty negative (current ${snap.totalQty})`, "NEGATIVE_STOCK");

        const availableQtyAfter = totalQtyAfter - snap.allocatedQty - snap.quarantinedQty;
        if (availableQtyAfter < 0) {
          throw new ApiError(409, `${snap.allocatedQty} units are allocated to orders — this would go negative`, "NEGATIVE_AVAILABLE");
        }

        const lowStockFlag = availableQtyAfter <= snap.reorderPolicy.minThreshold;

        snap.totalQty = totalQtyAfter;
        snap.availableQty = availableQtyAfter;
        snap.lowStockFlag = lowStockFlag;
        snap.lastMovementAt = new Date();
        snap.lastMovementReason = reasonCode;
        await snap.save({ session });

        await StockMovement.create(
          [
            {
              snapshotId: snap._id,
              sku: snap.sku,
              locationCode: snap.locationCode,
              reasonCode,
              qtyDelta,
              totalQtyAfter,
              availableQtyAfter,
              performedBy: req.user._id,
              notes,
            },
          ],
          { session }
        );

        response = { sku: snap.sku, locationCode: snap.locationCode, qtyDelta, totalQtyAfter, availableQtyAfter, lowStockFlag, reasonCode };
      });
    } finally {
      session.endSession();
    }

    res.json({ ok: true, ...response });
  })
);

// -----------------------------------------------------------------------
// GET /api/inventory/low-stock — reorder alert feed
// -----------------------------------------------------------------------
router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const snapshots = await InventorySnapshot.find({ lowStockFlag: true }).sort({ availableQty: 1 }).limit(200);
    const alerts = snapshots.map((s) => ({
      snapshotId: s._id,
      sku: s.sku,
      oemPartNumber: s.partSnapshot.oemPartNumber,
      partName: s.partSnapshot.partName,
      category: s.partSnapshot.category,
      locationCode: s.locationCode,
      zoneType: s.locationSnapshot.zoneType,
      availableQty: s.availableQty,
      minThreshold: s.reorderPolicy.minThreshold,
      maxThreshold: s.reorderPolicy.maxThreshold,
      reorderQty: s.reorderPolicy.reorderQty,
    }));
    res.json({ ok: true, alerts });
  })
);

// -----------------------------------------------------------------------
// GET /api/inventory/search?model=&q= — compatibility matrix
// -----------------------------------------------------------------------
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { model, q } = req.query;
    const filter = { isActive: true };

    if (model) filter["fitment.modelFamily"] = new RegExp(model.split(" ")[0], "i"); // e.g. "Pulsar" out of "Pulsar NS200"
    if (q) filter.$text = { $search: q };

    const parts = await SparePart.find(filter).limit(100);
    const skus = parts.map((p) => p.sku);
    const snapshots = await InventorySnapshot.find({ sku: { $in: skus } });

    const rows = parts.map((part) => {
      const partSnapshots = snapshots.filter((s) => s.sku === part.sku);
      return {
        sku: part.sku,
        oemPartNumber: part.oemPartNumber,
        partName: part.partName,
        category: part.category,
        crossReferences: part.crossReferences,
        totalAvailableQty: partSnapshots.reduce((sum, s) => sum + s.availableQty, 0),
        isHeavy: part.dimensions.isHeavy,
        locations: partSnapshots.map((s) => ({
          locationCode: s.locationCode,
          zoneType: s.locationSnapshot.zoneType,
          availableQty: s.availableQty,
        })),
      };
    });

    res.json({ ok: true, rows });
  })
);

module.exports = router;
