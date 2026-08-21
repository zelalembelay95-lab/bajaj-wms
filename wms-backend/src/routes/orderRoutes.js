const express = require("express");
const InventorySnapshot = require("../models/InventorySnapshot");
const WarehouseLocation = require("../models/WarehouseLocation");
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

module.exports = router;
