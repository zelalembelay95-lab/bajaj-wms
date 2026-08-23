const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// admin      — system/IT: manages staff logins, parts catalog, warehouse bins, branches. Company-wide.
// executive  — CEO/COO/General Manager: read-only visibility across ALL branches. No edit rights.
// manager    — Branch/Warehouse Manager: full operational control of ONE branch, approves stock
//              adjustments and purchase orders for it. Cannot manage users or the catalog.
// employee   — Store Keeper: day-to-day floor work (receive, pick) within ONE branch.
const ROLES = ["admin", "executive", "manager", "employee"];

// admin and executive are company-wide and have no single branch — branchCode is required for
// manager and employee, who are scoped to exactly one.
const BRANCH_SCOPED_ROLES = ["manager", "employee"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "employee" },
    // Free-text display title (e.g. "CEO", "COO", "Warehouse Manager") — separate from `role`,
    // which controls permissions. Two executives can have different titles but the same access.
    jobTitle: { type: String, trim: true },
    branchCode: { type: String, trim: true, uppercase: true, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("validate", function (next) {
  if (BRANCH_SCOPED_ROLES.includes(this.role) && !this.branchCode) {
    return next(new Error(`branchCode is required for role "${this.role}"`));
  }
  if (!BRANCH_SCOPED_ROLES.includes(this.role)) {
    this.branchCode = null; // admin/executive are company-wide, never branch-scoped
  }
  next();
});

userSchema.methods.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.statics.hashPassword = function (plainPassword) {
  return bcrypt.hash(plainPassword, 10);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
module.exports.BRANCH_SCOPED_ROLES = BRANCH_SCOPED_ROLES;
