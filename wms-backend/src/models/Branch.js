const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // e.g. "AA-MAIN"
    name: { type: String, required: true, trim: true }, // e.g. "Addis Ababa - Main Warehouse"
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);
