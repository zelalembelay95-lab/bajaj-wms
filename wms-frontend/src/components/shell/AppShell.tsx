import { Search, BellRing, ClipboardList, Warehouse, Wifi, WifiOff, LayoutDashboard, Bike, PackageSearch, Users, LogOut, FileText, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types";

export type ViewId = "dashboard" | "matrix" | "lowstock" | "picking" | "vehicles" | "parts" | "users" | "purchaseOrders" | "branches";

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Search; roles: UserRole[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "executive", "manager", "employee"] },
  { id: "matrix", label: "Compatibility", icon: Search, roles: ["admin", "executive", "manager", "employee"] },
  { id: "lowstock", label: "Low Stock", icon: BellRing, roles: ["admin", "executive", "manager", "employee"] },
  { id: "picking", label: "Picking Slip", icon: ClipboardList, roles: ["admin", "manager", "employee"] },
  { id: "vehicles", label: "Vehicles", icon: Bike, roles: ["admin", "executive", "manager", "employee"] },
  { id: "purchaseOrders", label: "Purchase Orders", icon: FileText, roles: ["admin", "executive", "manager", "employee"] },
  { id: "parts", label: "Spare Parts", icon: PackageSearch, roles: ["admin"] },
  { id: "branches", label: "Branches", icon: Building2, roles: ["admin"] },
  { id: "users", label: "Staff Logins", icon: Users, roles: ["admin"] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  executive: "Executive",
  manager: "Branch Manager",
  employee: "Store Keeper",
};

interface AppShellProps {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
  isOnline: boolean;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, isOnline, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const mobileItems = items.slice(0, 4); // bottom bar stays uncluttered on small screens

  return (
    <div className="flex min-h-screen flex-col bg-graphite-950 text-paper md:flex-row">
      {/* Desktop side rail */}
      <aside className="hidden w-20 flex-col items-center gap-1 border-r border-graphite-700 bg-graphite-900 py-4 md:flex lg:w-56 lg:items-stretch lg:px-3">
        <div className="mb-6 flex items-center gap-2 px-2 lg:px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-amber text-graphite-950">
            <Warehouse size={20} strokeWidth={2.5} />
          </div>
          <div className="hidden lg:block">
            <p className="font-display text-sm font-semibold leading-tight">Bajaj WMS</p>
            <p className="text-[11px] text-steel-400">{user?.branchCode ? "Addis Ababa - Main" : "All Branches"}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <ConnectionStatus isOnline={isOnline} compact />

        <div className="mt-2 border-t border-graphite-700 pt-2">
          <div className="hidden px-1 pb-1 lg:block">
            <p className="truncate text-xs font-medium text-paper">{user?.name}</p>
            <p className="truncate text-[11px] text-steel-500">{user ? (user.jobTitle || ROLE_LABELS[user.role]) : ""}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-steel-400 hover:bg-graphite-800 hover:text-signal-red lg:justify-start lg:px-3"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile/tablet top bar */}
      <header className="flex items-center justify-between border-b border-graphite-700 bg-graphite-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-amber text-graphite-950">
            <Warehouse size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight">Bajaj WMS</p>
            <p className="text-[10px] text-steel-500">{user?.name} · {user ? ROLE_LABELS[user.role] : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus isOnline={isOnline} />
          <button onClick={logout} className="text-steel-400 hover:text-signal-red">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile/tablet bottom tab bar — thumb-reachable on a handheld device */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-graphite-700 bg-graphite-900/95 backdrop-blur md:hidden">
        {mobileItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              active === item.id ? "text-signal-amber" : "text-steel-400"
            }`}
          >
            <item.icon size={20} strokeWidth={active === item.id ? 2.5 : 2} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: ViewId; label: string; icon: typeof Search };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors lg:px-3 ${
        active ? "bg-graphite-800 text-signal-amber" : "text-steel-400 hover:bg-graphite-800 hover:text-paper"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
      <span className="hidden lg:inline">{item.label}</span>
    </button>
  );
}

function ConnectionStatus({ isOnline, compact = false }: { isOnline: boolean; compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium ${
        isOnline ? "text-signal-teal" : "text-signal-red"
      } ${compact ? "justify-center lg:justify-start" : ""}`}
    >
      {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span className={compact ? "hidden lg:inline" : ""}>{isOnline ? "API Connected" : "Offline — demo data"}</span>
    </div>
  );
}
