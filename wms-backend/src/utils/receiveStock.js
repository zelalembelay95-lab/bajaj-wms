/**
 * The actual "add stock to a bin" transaction — shared by two call sites:
 *   1. POST /api/inventory/receive (manual receiving, no PO involved)
 *   2. PUT  /api/purchase-orders/:id/receive (closing out an approved PO)
 * Kept in one place so there's exactly one code path that can ever
 * increment InventorySnapshot — both call sites feed it and get back the
 * same shape, so a bug fix here fixes both instead of drifting apart.
 */
const mongoose = require("mongoose");
const WarehouseLocation = require("../models/WarehouseLocation");
const InventorySnapshot = require("../models/InventorySnapshot");
const StockMovement = require("../models/StockMovement");

/** Finds an active bin, IN THE GIVEN BRANCH, matching the part's default zone/category with spare capacity. */
async function assignBin(part, branchCode) {
  const candidates = await WarehouseLocation.find({ zoneType: part.defaultZoneType, branchCode, isActive: true }).limit(20);
  for (const loc of candidates) {
    if (loc.allowedCategory && loc.allowedCategory !== part.category) continue;
    const existing = await InventorySnapshot.findOne({ sku: part.sku, locationCode: loc.locationCode });
    const currentQty = existing?.totalQty ?? 0;
    if (currentQty < loc.capacity.maxUnits) return loc;
  }
  return null;
}

/**
 * Resolves which bin a receipt should land in: an explicit locationCode if
 * given (validated against the branch), otherwise auto-assigned. Returns
 * null if no bin could be resolved — callers turn that into their own
 * "NO_BIN_AVAILABLE"-style response.
 */
async function resolveReceivingLocation(part, branchCode, explicitLocationCode) {
  if (explicitLocationCode) {
    return WarehouseLocation.findOne({ locationCode: explicitLocationCode.trim().toUpperCase(), branchCode });
  }
  return assignBin(part, branchCode);
}

/**
 * Increments stock for one part at one location, inside its own
 * transaction, and appends the matching StockMovement. `reasonCode` is
 * "PURCHASE_RECEIPT" for both call sites today (manual receiving and PO
 * fulfillment are the same underlying event — goods arriving) — kept as a
 * parameter rather than hardcoded in case a future reason ever needs it.
 */
async function receiveIntoLocation({ part, location, branchCode, qty, userId, reasonCode = "PURCHASE_RECEIPT", notes }) {
  const session = await mongoose.startSession();
  try {
    let snapshot;
    await session.withTransaction(async () => {
      const existing = await InventorySnapshot.findOne({ sku: part.sku, locationCode: location.locationCode }).session(session);

      const prevTotal = existing?.totalQty ?? 0;
      const prevAllocated = existing?.allocatedQty ?? 0;
      const prevQuarantined = existing?.quarantinedQty ?? 0;
      const reorderPolicy = existing?.reorderPolicy ?? part.reorderPolicy;

      const newTotal = prevTotal + qty;
      const newAvailable = newTotal - prevAllocated - prevQuarantined;
      const lowStockFlag = newAvailable <= reorderPolicy.minThreshold;

      snapshot = await InventorySnapshot.findOneAndUpdate(
        { sku: part.sku, locationCode: location.locationCode },
        {
          sku: part.sku,
          locationCode: location.locationCode,
          branchCode,
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
          lastMovementReason: reasonCode,
        },
        { upsert: true, new: true, session }
      );

      await StockMovement.create(
        [
          {
            snapshotId: snapshot._id,
            sku: part.sku,
            locationCode: location.locationCode,
            branchCode,
            reasonCode,
            qtyDelta: qty,
            totalQtyAfter: newTotal,
            availableQtyAfter: newAvailable,
            performedBy: userId,
            ...(notes ? { notes } : {}),
          },
        ],
        { session }
      );
    });

    return snapshot;
  } finally {
    session.endSession();
  }
}

module.exports = { assignBin, resolveReceivingLocation, receiveIntoLocation };
