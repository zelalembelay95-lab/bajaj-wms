const mongoose = require("mongoose");

const PART_CATEGORIES = [
  "Engine", "Electrical", "Braking", "Body", "Suspension", "Transmission",
  "Fuel_System", "Exhaust", "Fasteners_Consumables", "Tyres_Wheels", "Accessories",
];

const ZONE_TYPES = [
  "BULK_FLOOR_STORAGE", "PALLET_RACKING", "HIGH_DENSITY_MICRO_BIN", "SHELVING_STANDARD",
  "HAZMAT_CAGE", "STAGING_OUTBOUND", "STAGING_INBOUND", "RETURNS_QUARANTINE",
];

const crossReferenceSchema = new mongoose.Schema(
  {
    refPartNumber: { type: String, required: true, trim: true, uppercase: true },
    relationship: {
      type: String,
      required: true,
      enum: ["SUPERSEDED_BY", "SUPERSEDES", "ALTERNATE", "AFTERMARKET_EQUIVALENT"],
    },
    note: String,
  },
  { _id: false }
);

const fitmentSchema = new mongoose.Schema(
  {
    modelFamily: { type: String, required: true },
    variant: { type: String, required: true }, // "*" = every variant in the family
    yearFrom: Number,
    yearTo: Number,
  },
  { _id: false }
);

const sparePartSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    oemPartNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    partName: { type: String, required: true, trim: true },
    description: String,
    category: { type: String, required: true, enum: PART_CATEGORIES },
    subCategory: String,
    unitOfMeasure: { type: String, required: true, enum: ["EA", "PAIR", "SET", "BOX", "KG", "LTR"] },
    crossReferences: [crossReferenceSchema],
    fitment: [fitmentSchema],
    dimensions: {
      weightGrams: { type: Number, default: 0 },
      isSmallPart: { type: Boolean, default: false },
      isHazmat: { type: Boolean, default: false },
      isHeavy: { type: Boolean, default: false }, // engines, wheels, frames — drives the UI's hazard-stripe badge
    },
    pricing: {
      mrp: Number,
      dealerPrice: Number,
      taxRatePercent: Number,
    },
    defaultZoneType: { type: String, required: true, enum: ZONE_TYPES },
    reorderPolicy: {
      minThreshold: { type: Number, required: true, default: 10 },
      maxThreshold: { type: Number, required: true, default: 100 },
      reorderQty: { type: Number, required: true, default: 50 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Every OEM/cross-ref number needs to resolve to this part in one indexed
// lookup — normalizedPartNumbers holds the primary number plus every
// cross-reference, kept in sync in a pre-save hook below.
sparePartSchema.add({ normalizedPartNumbers: [{ type: String, index: true }] });

sparePartSchema.pre("save", function (next) {
  const normalize = (s) => s.trim().toUpperCase().replace(/[\s-]/g, "");
  const all = new Set([normalize(this.oemPartNumber)]);
  for (const xref of this.crossReferences) all.add(normalize(xref.refPartNumber));
  this.normalizedPartNumbers = Array.from(all);
  next();
});

sparePartSchema.index({ partName: "text", oemPartNumber: "text", sku: "text" });

module.exports = mongoose.model("SparePart", sparePartSchema);
module.exports.PART_CATEGORIES = PART_CATEGORIES;
module.exports.ZONE_TYPES = ZONE_TYPES;
