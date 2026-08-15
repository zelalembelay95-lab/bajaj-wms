require("dotenv").config();
const { connectDB } = require("./config/db");
const mongoose = require("mongoose");

const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const SparePart = require("./models/SparePart");
const WarehouseLocation = require("./models/WarehouseLocation");
const InventorySnapshot = require("./models/InventorySnapshot");

async function seed() {
  await connectDB();

  // --- Admin account -------------------------------------------------
  const adminEmail = "admin@bajajwms.local";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "System Admin",
      email: adminEmail,
      passwordHash: await User.hashPassword("ChangeMe123!"),
      role: "admin",
    });
    console.log(`Created admin login: ${adminEmail} / ChangeMe123!  <-- change this password after first login`);
  }

  // --- Warehouse locations --------------------------------------------
  const locations = [
    { locationCode: "Z1-BULK-A12", zoneType: "BULK_FLOOR_STORAGE", zoneCode: "Z1", zoneLabel: "Bulk Floor Storage", displayLabel: "Bulk Floor A / Bay 12", capacity: { maxUnits: 40 }, storesVehicles: true },
    { locationCode: "Z2-A03-R02-S4", zoneType: "SHELVING_STANDARD", zoneCode: "Z2", zoneLabel: "Standard Shelving", aisle: "A03", rack: "R02", shelf: "S4", displayLabel: "Z2 / A03 / R02 / S4", capacity: { maxUnits: 500 } },
    { locationCode: "Z3-A01-R05-S2-BIN07", zoneType: "HIGH_DENSITY_MICRO_BIN", zoneCode: "Z3", zoneLabel: "High-Density Micro-Bins", aisle: "A01", rack: "R05", shelf: "S2", bin: "BIN-07", displayLabel: "Z3 / A01 / R05 / S2 / BIN-07", capacity: { maxUnits: 5000 }, allowedCategory: "Fasteners_Consumables" },
    { locationCode: "Z4-A02-R01-S1", zoneType: "HAZMAT_CAGE", zoneCode: "Z4", zoneLabel: "Hazmat Cage", aisle: "A02", rack: "R01", shelf: "S1", displayLabel: "Z4 / A02 / R01 / S1", capacity: { maxUnits: 200 }, isHazmatApproved: true },
  ];
  for (const loc of locations) {
    await WarehouseLocation.findOneAndUpdate({ locationCode: loc.locationCode }, loc, { upsert: true });
  }

  // --- Vehicles --------------------------------------------------------
  const vehicles = [
    { chassisNumber: "MD2A11AZ1PWB12345", engineNumber: "DZPWB1234567", modelFamily: "Pulsar", variant: "Pulsar NS200", vehicleType: "Motorcycle", color: "Pearl White", productionYear: 2026, status: "IN_STOCK", locationCode: "Z1-BULK-A12", invoiceValue: 148500 },
    { chassisNumber: "MD2D62CZ2PCB98765", engineNumber: "JBCB9876543", modelFamily: "Discover", variant: "Discover 125", vehicleType: "Motorcycle", color: "Ebony Black", productionYear: 2026, status: "ALLOCATED", locationCode: "Z1-BULK-A12", invoiceValue: 92000 },
    { chassisNumber: "MD2G51EZ3RAB55221", engineNumber: "FKAB5522109", modelFamily: "RE_Auto", variant: "RE Compact 4S", vehicleType: "ThreeWheeler", color: "Yellow/Black", productionYear: 2026, status: "PDI_PENDING", locationCode: "Z1-BULK-A12", invoiceValue: 231000 },
  ];
  for (const v of vehicles) {
    await Vehicle.findOneAndUpdate({ chassisNumber: v.chassisNumber }, v, { upsert: true });
  }

  // --- Spare parts -------------------------------------------------------
  const parts = [
    { sku: "SP-ENG-000482", oemPartNumber: "290569130", partName: "Piston Kit STD 150cc", category: "Engine", unitOfMeasure: "SET",
      crossReferences: [{ refPartNumber: "290569125", relationship: "SUPERSEDES" }, { refPartNumber: "AM-PST-150-STD", relationship: "AFTERMARKET_EQUIVALENT" }],
      fitment: [{ modelFamily: "Pulsar", variant: "Pulsar 150", yearFrom: 2018 }, { modelFamily: "Discover", variant: "Discover 150", yearFrom: 2019 }],
      dimensions: { weightGrams: 420, isSmallPart: false, isHazmat: false, isHeavy: true },
      defaultZoneType: "SHELVING_STANDARD", reorderPolicy: { minThreshold: 15, maxThreshold: 120, reorderQty: 60 } },
    { sku: "SP-ELE-001120", oemPartNumber: "310442087", partName: "CDI Unit — Digital Ignition", category: "Electrical", unitOfMeasure: "EA",
      crossReferences: [{ refPartNumber: "310442080", relationship: "SUPERSEDED_BY" }],
      fitment: [{ modelFamily: "Pulsar", variant: "Pulsar NS200", yearFrom: 2020 }],
      dimensions: { weightGrams: 180, isSmallPart: false, isHazmat: false, isHeavy: false },
      defaultZoneType: "SHELVING_STANDARD", reorderPolicy: { minThreshold: 10, maxThreshold: 80, reorderQty: 40 } },
    { sku: "SP-BRK-002391", oemPartNumber: "270318452", partName: "Front Brake Pad Set (Disc)", category: "Braking", unitOfMeasure: "SET",
      crossReferences: [],
      fitment: [{ modelFamily: "Pulsar", variant: "*", yearFrom: 2015 }, { modelFamily: "Dominar", variant: "Dominar 400", yearFrom: 2017 }],
      dimensions: { weightGrams: 250, isSmallPart: false, isHazmat: false, isHeavy: false },
      defaultZoneType: "SHELVING_STANDARD", reorderPolicy: { minThreshold: 25, maxThreshold: 200, reorderQty: 100 } },
    { sku: "SP-FAS-009901", oemPartNumber: "150223018", partName: "Spark Plug — Standard Heat Range", category: "Fasteners_Consumables", unitOfMeasure: "EA",
      crossReferences: [{ refPartNumber: "NGK-CPR8EA-9", relationship: "ALTERNATE" }],
      fitment: [{ modelFamily: "Boxer", variant: "*", yearFrom: 2010 }],
      dimensions: { weightGrams: 25, isSmallPart: true, isHazmat: false, isHeavy: false },
      defaultZoneType: "HIGH_DENSITY_MICRO_BIN", reorderPolicy: { minThreshold: 200, maxThreshold: 3000, reorderQty: 1500 } },
    { sku: "SP-ELE-004410", oemPartNumber: "310587120", partName: "12V 9Ah Maintenance-Free Battery", category: "Electrical", unitOfMeasure: "EA",
      crossReferences: [],
      fitment: [{ modelFamily: "Dominar", variant: "Dominar 400" }],
      dimensions: { weightGrams: 2800, isSmallPart: false, isHazmat: true, isHeavy: true },
      defaultZoneType: "HAZMAT_CAGE", reorderPolicy: { minThreshold: 8, maxThreshold: 60, reorderQty: 30 } },
  ];
  const savedParts = [];
  for (const p of parts) {
    const saved = await SparePart.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true, setDefaultsOnInsert: true });
    savedParts.push(saved);
  }

  // --- Inventory snapshots (two intentionally below threshold) ----------
  const snapshotSeeds = [
    { sku: "SP-ENG-000482", locationCode: "Z2-A03-R02-S4", totalQty: 42, allocatedQty: 6 },
    { sku: "SP-ELE-001120", locationCode: "Z2-A03-R02-S4", totalQty: 8, allocatedQty: 2 }, // below min
    { sku: "SP-BRK-002391", locationCode: "Z2-A03-R02-S4", totalQty: 140, allocatedQty: 20 },
    { sku: "SP-FAS-009901", locationCode: "Z3-A01-R05-S2-BIN07", totalQty: 2450, allocatedQty: 100 },
    { sku: "SP-ELE-004410", locationCode: "Z4-A02-R01-S1", totalQty: 22, allocatedQty: 4 },
  ];
  for (const s of snapshotSeeds) {
    const part = savedParts.find((p) => p.sku === s.sku);
    const loc = locations.find((l) => l.locationCode === s.locationCode);
    const availableQty = s.totalQty - s.allocatedQty;
    await InventorySnapshot.findOneAndUpdate(
      { sku: s.sku, locationCode: s.locationCode },
      {
        sku: s.sku,
        locationCode: s.locationCode,
        partSnapshot: { oemPartNumber: part.oemPartNumber, partName: part.partName, category: part.category, unitOfMeasure: part.unitOfMeasure, isHeavy: part.dimensions.isHeavy },
        locationSnapshot: { zoneType: loc.zoneType, displayLabel: loc.displayLabel },
        totalQty: s.totalQty,
        allocatedQty: s.allocatedQty,
        availableQty,
        quarantinedQty: 0,
        reorderPolicy: part.reorderPolicy,
        lowStockFlag: availableQty <= part.reorderPolicy.minThreshold,
        lastMovementAt: new Date(),
        lastMovementReason: "PURCHASE_RECEIPT",
      },
      { upsert: true }
    );
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
