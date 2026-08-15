const express = require("express");
const PurchaseOrder = require("../models/PurchaseOrder");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/purchase-orders
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 }).limit(100).populate("createdBy", "name email");
    res.json({ ok: true, orders });
  })
);

// POST /api/purchase-orders
router.post(
  "/",
  requireRole("admin", "employee"),
  asyncHandler(async (req, res) => {
    const { sku, qty, reason, partName } = req.body;
    if (!sku || !qty) throw new ApiError(400, "`sku` and `qty` are required", "BAD_REQUEST");

    const order = await PurchaseOrder.create({ sku, qty, partName, reason, createdBy: req.user._id, status: "SUBMITTED" });
    res.status(201).json({ ok: true, order });
  })
);

module.exports = router;
