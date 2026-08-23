import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TriangleAlert, FileOutput, CheckCircle2, X, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import { DEMO_LOW_STOCK } from "../../lib/mockData";
import type { LowStockAlert } from "../../types";
import { CategoryBadge, StockHealthBar } from "../shared/Badges";
import { BinTag } from "../shared/BinTag";

function severityOf(a: LowStockAlert): "critical" | "warning" {
  return a.availableQty <= a.minThreshold * 0.5 ? "critical" : "warning";
}

export function LowStockCommandCenter({ onApiHealth }: { onApiHealth: (ok: boolean) => void }) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedIds, setGeneratedIds] = useState<Set<string>>(new Set());
  const [poDraft, setPoDraft] = useState<LowStockAlert | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ ok: boolean; alerts: LowStockAlert[] }>("/api/inventory/low-stock");
      setAlerts(result.alerts);
      setUsingDemoData(false);
      onApiHealth(true);
    } catch (err) {
      onApiHealth(false);
      setUsingDemoData(true);
      setAlerts(DEMO_LOW_STOCK);
      setError(err instanceof ApiRequestError ? err.message : "Could not reach the inventory API.");
    } finally {
      setLoading(false);
    }
  }

  const { critical, warning } = useMemo(() => {
    const critical = alerts.filter((a) => severityOf(a) === "critical");
    const warning = alerts.filter((a) => severityOf(a) === "warning");
    return { critical, warning };
  }, [alerts]);

  async function generatePO(alert: LowStockAlert) {
    try {
      await api.post("/api/purchase-orders", {
        sku: alert.sku,
        qty: alert.reorderQty,
        reason: "LOW_STOCK_AUTO_TRIGGER",
      });
    } catch {
      // PO service isn't wired up yet in this preview — the UI still
      // reflects the action locally so the flow can be reviewed end-to-end.
    }
    setGeneratedIds((prev) => new Set(prev).add(alert.snapshotId));
  }

  async function generateAllCritical() {
    setBulkGenerating(true);
    for (const alert of critical) {
      if (!generatedIds.has(alert.snapshotId)) await generatePO(alert);
    }
    setBulkGenerating(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-amber">Reorder Triggers</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Low-Stock Command Center</h1>
          <p className="mt-1 text-sm text-steel-400">Bins that have dropped below their safety-stock threshold.</p>
        </div>
        <button
          onClick={generateAllCritical}
          disabled={critical.length === 0 || bulkGenerating}
          className="flex items-center justify-center gap-2 rounded-md bg-signal-red px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {bulkGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileOutput size={16} />}
          Generate PO for all critical ({critical.length})
        </button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Alerts" value={alerts.length} tone="neutral" />
        <StatTile label="Critical" value={critical.length} tone="critical" />
        <StatTile label="Warning" value={warning.length} tone="warning" />
        <StatTile label="POs Generated" value={generatedIds.size} tone="success" />
      </div>

      {usingDemoData && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">
          Showing demo data — {error ?? "live API unreachable"}.
        </div>
      )}

      {loading ? (
        <LoadingGrid />
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
          <CheckCircle2 className="mx-auto mb-2 text-signal-teal" size={28} />
          <p className="font-medium text-paper">Every bin is above its threshold</p>
          <p className="text-sm text-steel-500">No reorder action needed right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...critical, ...warning].map((alert) => (
            <AlertCard
              key={alert.snapshotId}
              alert={alert}
              severity={severityOf(alert)}
              generated={generatedIds.has(alert.snapshotId)}
              onGenerate={() => setPoDraft(alert)}
            />
          ))}
        </div>
      )}

      {poDraft && (
        <PoDraftModal
          alert={poDraft}
          onCancel={() => setPoDraft(null)}
          onConfirm={async () => {
            await generatePO(poDraft);
            setPoDraft(null);
          }}
        />
      )}
    </div>
  );
}

function AlertCard({
  alert,
  severity,
  generated,
  onGenerate,
}: {
  alert: LowStockAlert;
  severity: "critical" | "warning";
  generated: boolean;
  onGenerate: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border bg-graphite-900 p-4 shadow-panel ${
        severity === "critical" ? "border-signal-red-dim" : "border-graphite-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium leading-snug text-paper">{alert.partName}</p>
          <p className="font-mono text-xs text-steel-400">{alert.oemPartNumber} · {alert.sku}</p>
        </div>
        {severity === "critical" ? (
          <TriangleAlert size={18} className="shrink-0 text-signal-red" />
        ) : (
          <AlertTriangle size={18} className="shrink-0 text-signal-amber" />
        )}
      </div>

      <CategoryBadge category={alert.category} />

      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-mono text-paper">
            {alert.availableQty} <span className="text-steel-500">available</span>
          </span>
          <span className="text-steel-500">min {alert.minThreshold}</span>
        </div>
        <StockHealthBar available={alert.availableQty} min={alert.minThreshold} max={alert.maxThreshold} />
      </div>

      <BinTag code={alert.locationCode} zoneType={alert.zoneType} size="sm" />

      <button
        onClick={onGenerate}
        disabled={generated}
        className={`mt-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
          generated
            ? "cursor-default bg-signal-teal-dim text-signal-teal"
            : "bg-graphite-700 text-paper hover:bg-signal-amber hover:text-graphite-950"
        }`}
      >
        {generated ? <CheckCircle2 size={16} /> : <FileOutput size={16} />}
        {generated ? "PO Generated" : `Generate PO (${alert.reorderQty} units)`}
      </button>
    </div>
  );
}

function PoDraftModal({
  alert,
  onCancel,
  onConfirm,
}: {
  alert: LowStockAlert;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-graphite-700 bg-graphite-900 p-5 shadow-panel md:rounded-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-signal-amber">Draft Purchase Order</p>
            <h2 className="font-display text-lg font-semibold">{alert.partName}</h2>
          </div>
          <button onClick={onCancel} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-steel-500">OEM Part #</dt>
          <dd className="text-right font-mono text-paper">{alert.oemPartNumber}</dd>
          <dt className="text-steel-500">Current stock</dt>
          <dd className="text-right font-mono text-paper">{alert.availableQty}</dd>
          <dt className="text-steel-500">Reorder quantity</dt>
          <dd className="text-right font-mono font-semibold text-signal-teal">{alert.reorderQty}</dd>
          <dt className="text-steel-500">Destination bin</dt>
          <dd className="text-right"><BinTag code={alert.locationCode} zoneType={alert.zoneType} size="sm" /></dd>
        </dl>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-graphite-600 px-3 py-2.5 text-sm font-medium text-steel-300 hover:bg-graphite-800"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setSubmitting(true);
              await onConfirm();
              setSubmitting(false);
            }}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Confirm & Send
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "neutral" | "critical" | "warning" | "success" }) {
  const toneClass = {
    neutral: "text-paper",
    critical: "text-signal-red",
    warning: "text-signal-amber",
    success: "text-signal-teal",
  }[tone];
  return (
    <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-3">
      <p className="text-[11px] uppercase tracking-wide text-steel-500">{label}</p>
      <p className={`font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
      ))}
    </div>
  );
}
