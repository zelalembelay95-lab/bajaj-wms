const mongoose = require("mongoose");

const VEHICLE_STATUSES = ["IN_TRANSIT", "IN_STOCK", "PDI_PENDING", "ALLOCATED", "DISPATCHED", "DAMAGED", "RETURNED"];

const vehicleSchema = new mongoose.Schema(
  {
    chassisNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    engineNumber: { type: String, required: true, trim: true, uppercase: true },
    modelFamily: {
      type: String,
      required: true,
      enum: ["Pulsar", "Discover", "Platina", "Avenger", "Dominar", "CT", "Boxer", "RE_Auto", "Qute"],
    },
    variant: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, enum: ["Motorcycle", "Scooter", "ThreeWheeler"] },
    color: { type: String, required: true, trim: true },
    colorCode: { type: String, trim: true },
    productionYear: { type: Number, required: true },
    manufacturingDate: Date,
    invoiceNumber: { type: String, trim: true },
    status: { type: String, enum: VEHICLE_STATUSES, default: "IN_STOCK" },
    branchCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    locationCode: { type: String, trim: true, uppercase: true },
    odometerKm: { type: Number, default: 0 },
    invoiceValue: Number,
    salesOrderId: { type: String, default: null },
    dealerCode: { type: String, default: null },
    qcNotes: String,
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1, modelFamily: 1 });

module.exports = mongoose.model("Vehicle", vehicleSchema);
module.exports.VEHICLE_STATUSES = VEHICLE_STATUSES;
