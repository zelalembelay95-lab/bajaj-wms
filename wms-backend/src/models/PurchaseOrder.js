const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    partName: String,
    qty: { type: Number, required: true },
    status: { type: String, enum: ["DRAFT", "SUBMITTED", "RECEIVED", "CANCELLED"], default: "DRAFT" },
    reason: { type: String, default: "LOW_STOCK_AUTO_TRIGGER" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
