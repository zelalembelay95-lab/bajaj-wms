const express = require("express");
const SparePart = require("../models/SparePart");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/spare-parts?category=&q=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, q } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };
    const parts = await SparePart.find(filter).sort({ partName: 1 }).limit(200);
    res.json({ ok: true, parts });
  })
);

// POST /api/spare-parts — admin only (catalog changes shouldn't come from the floor)
router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const part = await SparePart.create(req.body);
    res.status(201).json({ ok: true, part });
  })
);

router.put(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const part = await SparePart.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!part) throw new ApiError(404, "Spare part not found", "NOT_FOUND");
    res.json({ ok: true, part });
  })
);

module.exports = router;
