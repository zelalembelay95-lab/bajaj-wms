const mongoose = require("mongoose");
const { ZONE_TYPES, PART_CATEGORIES } = require("./SparePart");

const warehouseLocationSchema = new mongoose.Schema(
  {
    locationCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    zoneType: { type: String, required: true, enum: ZONE_TYPES },
    zoneCode: { type: String, required: true, trim: true, uppercase: true },
    zoneLabel: { type: String, required: true },
    aisle: String,
    rack: String,
    shelf: String,
    bin: String,
    displayLabel: { type: String, required: true },
    capacity: {
      maxUnits: { type: Number, required: true, default: 100 },
      maxWeightKg: Number,
    },
    allowedCategory: { type: String, enum: PART_CATEGORIES },
    storesVehicles: { type: Boolean, default: false },
    isHazmatApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

warehouseLocationSchema.index({ zoneType: 1, isActive: 1 });

module.exports = mongoose.model("WarehouseLocation", warehouseLocationSchema);
