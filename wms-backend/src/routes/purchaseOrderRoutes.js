const express = require("express");
const PurchaseOrder = require("../models/PurchaseOrder");
const User = require("../models/User");
const SparePart = require("../models/SparePart");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { branchFilter, resolveWriteBranch, assertOwnBranch } = require("../middleware/branchScope");
const { sendEmail } = require("../utils/sendEmail");
const { resolveReceivingLocation, receiveIntoLocation } = require("../utils/receiveStock");

const router = express.Router();
router.use(requireAuth);

// GET /api/purchase-orders?branch=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = branchFilter(req.user, req.query.branch);
    const orders = await PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("receivedBy", "name email");
    res.json({ ok: true, orders });
  })
);

// POST /api/purchase-orders — any operational role can raise one (e.g. off a low-stock alert)
router.post(
  "/",
  requireRole("admin", "manager", "employee"),
  asyncHandler(async (req, res) => {
    const { sku, qty, reason, partName } = req.body;
    if (!sku || !qty) throw new ApiError(400, "`sku` and `qty` are required", "BAD_REQUEST");

    const branchCode = resolveWriteBranch(req.user, req.body.branchCode);
    const order = await PurchaseOrder.create({ sku, qty, partName, reason, branchCode, createdBy: req.user._id, status: "SUBMITTED" });

    // Notify whoever can actually approve this: every Admin (company-wide) plus
    // this branch's Manager(s). Best-effort — sendEmail never throws, so a down
    // email provider can never fail the PO creation itself.
    const approvers = await User.find({
      isActive: true,
      $or: [{ role: "admin" }, { role: "manager", branchCode }],
    }).select("email");
    const recipientEmails = approvers.map((u) => u.email);

    if (recipientEmails.length > 0) {
      const appUrl = process.env.FRONTEND_URL || "";
      await sendEmail({
        to: recipientEmails,
        subject: `Purchase order pending approval — ${partName || sku}`,
        html: `
          <p><strong>${req.user.name}</strong> submitted a purchase order awaiting your approval:</p>
          <ul>
            <li><strong>Part:</strong> ${partName || sku} (${sku})</li>
            <li><strong>Quantity:</strong> ${qty}</li>
            <li><strong>Branch:</strong> ${branchCode}</li>
            <li><strong>Reason:</strong> ${reason || "Not specified"}</li>
          </ul>
          ${appUrl ? `<p><a href="${appUrl}">Open GUZO WMS to approve or cancel it</a></p>` : ""}
        `,
      });
    }

    res.status(201).json({ ok: true, order });
  })
);

// PUT /api/purchase-orders/:id/approve — Manager (their own branch) or Admin only
router.put(
  "/:id/approve",
  requireRole("admin", "manager"),
  asyncHandler(async (req, res) => {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) throw new ApiError(404, "Purchase order not found", "NOT_FOUND");
    assertOwnBranch(req.user, order.branchCode);
    if (order.status !== "SUBMITTED") {
      throw new ApiError(409, `Cannot approve a PO in status "${order.status}"`, "INVALID_STATE");
    }

    order.status = "APPROVED";
    order.approvedBy = req.user._id;
    order.approvedAt = new Date();
    await order.save();

    res.json({ ok: true, order });
  })
);

// PUT /api/purchase-orders/:id/receive — the goods have actually arrived.
// This is the one action that both closes out the PO AND moves real stock —
// unlike approve/cancel, which are pure status changes. Only valid from
// APPROVED, so a PO can't be "received" before anyone signed off on it.
router.put(
  "/:id/receive",
  requireRole("admin", "manager", "employee"),
  asyncHandler(async (req, res) => {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) throw new ApiError(404, "Purchase order not found", "NOT_FOUND");
    assertOwnBranch(req.user, order.branchCode);
    if (order.status !== "APPROVED") {
      throw new ApiError(409, `Cannot receive a PO in status "${order.status}" — it must be Approved first`, "INVALID_STATE");
    }

    const part = await SparePart.findOne({ sku: order.sku, isActive: true });
    if (!part) throw new ApiError(404, `Spare part "${order.sku}" not found in the catalog`, "PART_NOT_FOUND");

    const location = await resolveReceivingLocation(part, order.branchCode, req.body.locationCode);
    if (!location) {
      throw new ApiError(
        409,
        `No active ${part.defaultZoneType} bin with spare capacity for "${part.category}" in branch ${order.branchCode}. Provision a bin, or pass a specific locationCode.`,
        "NO_BIN_AVAILABLE"
      );
    }

    const snapshot = await receiveIntoLocation({
      part,
      location,
      branchCode: order.branchCode,
      qty: order.qty,
      userId: req.user._id,
      notes: `Received against PO ${order._id}`,
    });

    order.status = "RECEIVED";
    order.receivedBy = req.user._id;
    order.receivedAt = new Date();
    order.receivedLocationCode = location.locationCode;
    await order.save();

    res.json({
      ok: true,
      order,
      inventory: { locationCode: location.locationCode, newTotalQty: snapshot.totalQty, newAvailableQty: snapshot.availableQty },
    });
  })
);

// PUT /api/purchase-orders/:id/cancel — Manager (own branch) or Admin
router.put(
  "/:id/cancel",
  requireRole("admin", "manager"),
  asyncHandler(async (req, res) => {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) throw new ApiError(404, "Purchase order not found", "NOT_FOUND");
    assertOwnBranch(req.user, order.branchCode);
    if (["RECEIVED", "CANCELLED"].includes(order.status)) {
      throw new ApiError(409, `Cannot cancel a PO in status "${order.status}"`, "INVALID_STATE");
    }

    order.status = "CANCELLED";
    await order.save();

    res.json({ ok: true, order });
  })
);

module.exports = router;
