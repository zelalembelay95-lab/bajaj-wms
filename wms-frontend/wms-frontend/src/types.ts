export type PartCategory =
  | "Engine"
  | "Electrical"
  | "Braking"
  | "Body"
  | "Suspension"
  | "Transmission"
  | "Fuel_System"
  | "Exhaust"
  | "Fasteners_Consumables"
  | "Tyres_Wheels"
  | "Accessories";

export type ZoneType =
  | "BULK_FLOOR_STORAGE"
  | "PALLET_RACKING"
  | "HIGH_DENSITY_MICRO_BIN"
  | "SHELVING_STANDARD"
  | "HAZMAT_CAGE"
  | "STAGING_OUTBOUND"
  | "STAGING_INBOUND"
  | "RETURNS_QUARANTINE";

export interface CrossReference {
  refPartNumber: string;
  relationship: "SUPERSEDED_BY" | "SUPERSEDES" | "ALTERNATE" | "AFTERMARKET_EQUIVALENT";
}

/** Result row for GET /api/inventory/search?model=&q= */
export interface CompatibilityMatrixRow {
  sku: string;
  oemPartNumber: string;
  partName: string;
  category: PartCategory;
  crossReferences: CrossReference[];
  totalAvailableQty: number;
  isHeavy: boolean;
  locations: { locationCode: string; zoneType: ZoneType; availableQty: number }[];
}

/** Result row for GET /api/inventory/low-stock */
export interface LowStockAlert {
  snapshotId: string;
  sku: string;
  oemPartNumber: string;
  partName: string;
  category: PartCategory;
  locationCode: string;
  zoneType: ZoneType;
  availableQty: number;
  minThreshold: number;
  maxThreshold: number;
  reorderQty: number;
}

/** Matches PickStop from POST /api/orders/pick-list, plus category/weight for badges. */
export interface PickStop {
  sku: string;
  partName: string;
  qtyToPick: number;
  locationCode: string;
  zoneCode: string;
  zoneLabel: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  displayLabel: string;
  category?: PartCategory;
  isHeavy?: boolean;
}

export interface PickListResponse {
  orderId: string;
  route: PickStop[];
  shortages: { sku: string; qtyRequested: number; qtyAvailable: number; qtyShort: number }[];
}

export type UserRole = "admin" | "employee";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type VehicleStatus =
  | "IN_TRANSIT"
  | "IN_STOCK"
  | "PDI_PENDING"
  | "ALLOCATED"
  | "DISPATCHED"
  | "DAMAGED"
  | "RETURNED";

export interface Vehicle {
  _id: string;
  chassisNumber: string;
  engineNumber: string;
  modelFamily: string;
  variant: string;
  vehicleType: "Motorcycle" | "Scooter" | "ThreeWheeler";
  color: string;
  productionYear: number;
  status: VehicleStatus;
  locationCode?: string;
  invoiceValue?: number;
  createdAt: string;
}

export interface SparePartRecord {
  _id: string;
  sku: string;
  oemPartNumber: string;
  partName: string;
  category: PartCategory;
  unitOfMeasure: string;
  defaultZoneType: ZoneType;
  isActive: boolean;
}

export interface PurchaseOrder {
  _id: string;
  sku: string;
  partName?: string;
  qty: number;
  status: "DRAFT" | "SUBMITTED" | "RECEIVED" | "CANCELLED";
  reason?: string;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

export interface DashboardSummary {
  vehiclesInStock: number;
  activeSpareParts: number;
  lowStockAlerts: number;
  recentMovements: {
    sku: string;
    locationCode: string;
    reasonCode: string;
    qtyDelta: number;
    performedBy: string;
    timestamp: string;
  }[];
}
