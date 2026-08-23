const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    partName: String,
    qty: { type: Number, required: true },
    branchCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    // DRAFT -> SUBMITTED (by employee/manager) -> APPROVED (by manager/admin) -> RECEIVED
    // Any non-terminal state can move to CANCELLED.
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "RECEIVED", "CANCELLED"],
      default: "SUBMITTED",
    },
    reason: { type: String, default: "LOW_STOCK_AUTO_TRIGGER" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
