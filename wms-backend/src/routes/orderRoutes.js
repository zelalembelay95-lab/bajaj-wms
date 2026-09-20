const express = require("express");
const mongoose = require("mongoose");
const InventorySnapshot = require("../models/InventorySnapshot");
const WarehouseLocation = require("../models/WarehouseLocation");
const StockMovement = require("../models/StockMovement");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { branchFilter } = require("../middleware/branchScope");

const router = express.Router();
router.use(requireAuth);

function compareByWarehousePath(a, b) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  return (
    collator.compare(a.zoneCode, b.zoneCode) ||
    collator.compare(a.aisle ?? "", b.aisle ?? "") ||
    collator.compare(a.rack ?? "", b.rack ?? "") ||
    collator.compare(a.shelf ?? "", b.shelf ?? "") ||
    collator.compare(a.bin ?? "", b.bin ?? "")
  );
}

async function allocateSku(sku, qtyRequested, branchScope) {
  const snapshots = await InventorySnapshot.find({ sku, availableQty: { $gt: 0 }, ...branchScope })
    .sort({ availableQty: -1 })
    .limit(20);

  const stops = [];
  let remaining = qtyRequested;
  let totalAvailable = 0;

  for (const snap of snapshots) {
    totalAvailable += snap.availableQty;
    if (remaining <= 0) continue;

    const loc = await WarehouseLocation.findOne({ locationCode: snap.locationCode });
    if (!loc) continue;

    const qtyHere = Math.min(remaining, snap.availableQty);
    stops.push({
      sku,
      partName: snap.partSnapshot.partName,
      qtyToPick: qtyHere,
      locationCode: loc.locationCode,
      zoneCode: loc.zoneCode,
      zoneLabel: loc.zoneLabel,
      aisle: loc.aisle,
      rack: loc.rack,
      shelf: loc.shelf,
      bin: loc.bin,
      displayLabel: loc.displayLabel,
      category: snap.partSnapshot.category,
      isHeavy: snap.partSnapshot.isHeavy,
    });
    remaining -= qtyHere;
  }

  return { stops, qtyAvailable: totalAvailable };
}

// POST /api/orders/pick-list
router.post(
  "/pick-list",
  asyncHandler(async (req, res) => {
    const { orderId, items } = req.body;
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "`orderId` and a non-empty `items` array are required", "BAD_REQUEST");
    }

    const route = [];
    const shortages = [];
    const scope = branchFilter(req.user, req.body.branch);

    for (const item of items) {
      if (!item.sku || !item.qtyRequested || item.qtyRequested <= 0) {
        throw new ApiError(400, `Invalid line item: ${JSON.stringify(item)}`, "BAD_REQUEST");
      }
      const { stops, qtyAvailable } = await allocateSku(item.sku, item.qtyRequested, scope);
      route.push(...stops);

      const qtyPicked = stops.reduce((sum, s) => sum + s.qtyToPick, 0);
      if (qtyPicked < item.qtyRequested) {
        shortages.push({ sku: item.sku, qtyRequested: item.qtyRequested, qtyAvailable, qtyShort: item.qtyRequested - qtyPicked });
      }
    }

    route.sort(compareByWarehousePath);
    res.json({ ok: true, orderId, route, shortages });
  })
);

// -----------------------------------------------------------------------
// POST /api/orders/confirm-pick — called when a picker taps "Complete Pick".
// This is what actually removes the picked units from stock; generating a
// pick-list above never touches inventory by itself, it only proposes a
// route. Each line is applied inside its own transaction so a partial
// failure (e.g. someone else already picked that bin down to zero) doesn't
// silently lose track of what actually left the shelf.
// -----------------------------------------------------------------------
router.post(
  "/confirm-pick",
  asyncHandler(async (req, res) => {
    const { orderId, items } = req.body;
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "`orderId` and a non-empty `items` array are required", "BAD_REQUEST");
    }

    const results = [];
    for (const item of items) {
      const { sku, locationCode, qtyPicked } = item;
      if (!sku || !locationCode || !qtyPicked || qtyPicked <= 0) {
        results.push({ sku, locationCode, status: "ERROR", message: "sku, locationCode, and a positive qtyPicked are required" });
        continue;
      }

      const session = await mongoose.startSession();
      try {
        let outcome;
        await session.withTransaction(async () => {
          const snap = await InventorySnapshot.findOne({ sku, locationCode }).session(session);
          if (!snap) {
            outcome = { sku, locationCode, status: "ERROR", message: "No inventory record at that bin" };
            return;
          }
          if (Object.keys(branchFilter(req.user)).length && snap.branchCode !== req.user.branchCode) {
            outcome = { sku, locationCode, status: "ERROR", message: "That bin is outside your branch" };
            return;
          }
          if (snap.availableQty < qtyPicked) {
            outcome = {
              sku,
              locationCode,
              status: "ERROR",
              message: `Only ${snap.availableQty} available, cannot pick ${qtyPicked}`,
            };
            return;
          }

          const totalQtyAfter = snap.totalQty - qtyPicked;
          const availableQtyAfter = snap.availableQty - qtyPicked;
          const lowStockFlag = availableQtyAfter <= snap.reorderPolicy.minThreshold;

          snap.totalQty = totalQtyAfter;
          snap.availableQty = availableQtyAfter;
          snap.lowStockFlag = lowStockFlag;
          snap.lastMovementAt = new Date();
          snap.lastMovementReason = "PICK_FOR_ORDER";
          await snap.save({ session });

          await StockMovement.create(
            [
              {
                snapshotId: snap._id,
                sku,
                locationCode,
                branchCode: snap.branchCode,
                reasonCode: "PICK_FOR_ORDER",
                qtyDelta: -qtyPicked,
                totalQtyAfter,
                availableQtyAfter,
                performedBy: req.user._id,
                notes: `Order ${orderId}`,
              },
            ],
            { session }
          );

          outcome = { sku, locationCode, qtyPicked, availableQtyAfter, lowStockFlag, status: "OK" };
        });
        results.push(outcome);
      } finally {
        session.endSession();
      }
    }

    const allOk = results.every((r) => r.status === "OK");
    res.status(allOk ? 200 : 207).json({ ok: allOk, orderId, results });
  })
);

module.exports = router;
