require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/db");
const { errorHandler } = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const vehicleRoutes = require("./src/routes/vehicleRoutes");
const sparePartRoutes = require("./src/routes/sparePartRoutes");
const warehouseLocationRoutes = require("./src/routes/warehouseLocationRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const purchaseOrderRoutes = require("./src/routes/purchaseOrderRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (req, res) => res.json({ ok: true, service: "bajaj-wms-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/spare-parts", sparePartRoutes);
app.use("/api/warehouse-locations", warehouseLocationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found", code: "NOT_FOUND" }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Bajaj WMS backend listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
