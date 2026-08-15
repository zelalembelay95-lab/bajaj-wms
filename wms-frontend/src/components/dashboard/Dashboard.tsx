import { useEffect, useState } from "react";
import { Bike, PackageCheck, AlertTriangle, Activity } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { DashboardSummary } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ ok: true; summary: DashboardSummary }>("/api/dashboard/summary")
      .then((r) => setSummary(r.summary))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Overview</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-steel-400">
          {user?.role === "admin" ? "Admin" : "Employee"} · {user?.email}
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">
          {error} — is the backend running and is <code>VITE_API_BASE_URL</code> set correctly?
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={Bike} label="Vehicles in Stock" value={summary?.vehiclesInStock ?? 0} tone="teal" />
          <StatCard icon={PackageCheck} label="Active Spare Parts" value={summary?.activeSpareParts ?? 0} tone="neutral" />
          <StatCard icon={AlertTriangle} label="Low-Stock Alerts" value={summary?.lowStockAlerts ?? 0} tone="amber" />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-graphite-700 bg-graphite-900 p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={16} className="text-signal-teal" />
          <h2 className="font-display text-sm font-semibold">Recent Stock Movements</h2>
        </div>
        {summary && summary.recentMovements.length > 0 ? (
          <ul className="flex flex-col divide-y divide-graphite-800">
            {summary.recentMovements.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-paper">{m.sku}</p>
                  <p className="text-xs text-steel-500">
                    {m.reasonCode.replace(/_/g, " ").toLowerCase()} · {m.locationCode} · by {m.performedBy}
                  </p>
                </div>
                <span className={`shrink-0 font-mono text-sm font-semibold ${m.qtyDelta >= 0 ? "text-signal-teal" : "text-signal-red"}`}>
                  {m.qtyDelta >= 0 ? "+" : ""}
                  {m.qtyDelta}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-steel-500">No stock movements yet.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Bike;
  label: string;
  value: number;
  tone: "teal" | "amber" | "neutral";
}) {
  const toneClass = { teal: "text-signal-teal", amber: "text-signal-amber", neutral: "text-paper" }[tone];
  return (
    <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-4 shadow-panel">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-steel-500">{label}</p>
        <Icon size={16} className={toneClass} />
      </div>
      <p className={`font-display text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
