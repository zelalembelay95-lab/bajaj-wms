const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "InventorySnapshot", required: true, index: true },
    sku: { type: String, required: true },
    locationCode: { type: String, required: true },
    reasonCode: {
      type: String,
      required: true,
      enum: [
        "PURCHASE_RECEIPT", "CYCLE_COUNT_ADJUSTMENT", "DAMAGE_WRITE_OFF",
        "RETURN_TO_STOCK", "TRANSFER_IN", "TRANSFER_OUT", "PICK_FOR_ORDER", "PICK_RELEASE_CANCELLED",
      ],
    },
    qtyDelta: { type: Number, required: true },
    totalQtyAfter: { type: Number, required: true },
    availableQtyAfter: { type: Number, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    notes: String,
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

// Append-only ledger — no update/delete routes are exposed for this model anywhere in the API.
module.exports = mongoose.model("StockMovement", stockMovementSchema);
