const mongoose = require("mongoose");

const inventorySnapshotSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, uppercase: true, index: true },
    locationCode: { type: String, required: true, uppercase: true, index: true },

    // Denormalized so list views don't need a second query per row.
    partSnapshot: {
      oemPartNumber: String,
      partName: String,
      category: String,
      unitOfMeasure: String,
      isHeavy: Boolean,
    },
    locationSnapshot: {
      zoneType: String,
      displayLabel: String,
    },

    totalQty: { type: Number, required: true, default: 0 },
    allocatedQty: { type: Number, required: true, default: 0 },
    availableQty: { type: Number, required: true, default: 0 },
    quarantinedQty: { type: Number, required: true, default: 0 },

    reorderPolicy: {
      minThreshold: { type: Number, required: true },
      maxThreshold: { type: Number, required: true },
      reorderQty: { type: Number, required: true },
    },

    // Stored (not just derived) so a low-stock list is a plain indexed query.
    lowStockFlag: { type: Boolean, default: false, index: true },

    lastMovementAt: Date,
    lastMovementReason: String,
  },
  { timestamps: true }
);

inventorySnapshotSchema.index({ sku: 1, locationCode: 1 }, { unique: true });

module.exports = mongoose.model("InventorySnapshot", inventorySnapshotSchema);
