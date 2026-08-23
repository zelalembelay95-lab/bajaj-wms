import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/auth/LoginPage";
import { AppShell, type ViewId } from "./components/shell/AppShell";
import { Dashboard } from "./components/dashboard/Dashboard";
import { InventoryMatrix } from "./components/inventory/InventoryMatrix";
import { LowStockCommandCenter } from "./components/lowstock/LowStockCommandCenter";
import { PickingSlip } from "./components/picking/PickingSlip";
import { VehiclesAdmin } from "./components/admin/VehiclesAdmin";
import { SparePartsAdmin } from "./components/admin/SparePartsAdmin";
import { UsersAdmin } from "./components/admin/UsersAdmin";
import { BranchesAdmin } from "./components/admin/BranchesAdmin";
import { PurchaseOrdersView } from "./components/purchaseorders/PurchaseOrdersView";

function AuthenticatedApp() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [apiOnline, setApiOnline] = useState(true);

  return (
    <AppShell active={view} onNavigate={setView} isOnline={apiOnline}>
      {view === "dashboard" && <Dashboard />}
      {view === "matrix" && <InventoryMatrix onApiHealth={setApiOnline} />}
      {view === "lowstock" && <LowStockCommandCenter onApiHealth={setApiOnline} />}
      {view === "picking" && <PickingSlip onApiHealth={setApiOnline} />}
      {view === "vehicles" && <VehiclesAdmin />}
      {view === "purchaseOrders" && <PurchaseOrdersView />}
      {view === "parts" && <SparePartsAdmin />}
      {view === "branches" && <BranchesAdmin />}
      {view === "users" && <UsersAdmin />}
    </AppShell>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-graphite-700 border-t-signal-amber" />
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
