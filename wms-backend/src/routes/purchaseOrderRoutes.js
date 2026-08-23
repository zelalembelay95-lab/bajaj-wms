const express = require("express");
const PurchaseOrder = require("../models/PurchaseOrder");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");
const { branchFilter, resolveWriteBranch, assertOwnBranch } = require("../middleware/branchScope");
const { sendEmail } = require("../utils/sendEmail");

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
      .populate("approvedBy", "name email");
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
          ${appUrl ? `<p><a href="${appUrl}">Open Bajaj WMS to approve or cancel it</a></p>` : ""}
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
