import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, PackageCheck, TriangleAlert, RotateCcw } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import { DEMO_PICK_LIST } from "../../lib/mockData";
import type { PickListResponse, PickStop } from "../../types";
import { CategoryBadge, WeightBadge } from "../shared/Badges";
import { BinTag } from "../shared/BinTag";

const DEMO_ORDER_ITEMS = [
  { sku: "SP-ELE-004410", qtyRequested: 2 },
  { sku: "SP-ENG-000482", qtyRequested: 4 },
  { sku: "SP-BRK-002391", qtyRequested: 10 },
  { sku: "SP-FAS-009901", qtyRequested: 20 },
];

function stopKey(stop: PickStop) {
  return `${stop.sku}__${stop.locationCode}`;
}

export function PickingSlip({ onApiHealth }: { onApiHealth: (ok: boolean) => void }) {
  const [orderId, setOrderId] = useState("SO-2026-04471");
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function loadPickList() {
    setLoading(true);
    setError(null);
    setChecked(new Set());
    try {
      const result = await api.post<PickListResponse>("/api/orders/pick-list", {
        orderId,
        items: DEMO_ORDER_ITEMS,
      });
      setPickList(result);
      setUsingDemoData(false);
      onApiHealth(true);
    } catch (err) {
      onApiHealth(false);
      setUsingDemoData(true);
      setPickList({ ...DEMO_PICK_LIST, orderId });
      setError(err instanceof ApiRequestError ? err.message : "Could not reach the pick-list API.");
    } finally {
      setLoading(false);
    }
  }

  const toggle = (stop: PickStop) =>
    setChecked((prev) => {
      const next = new Set(prev);
      const key = stopKey(stop);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const route = pickList?.route ?? [];
  const allPicked = route.length > 0 && checked.size === route.length;
  const progressPct = route.length > 0 ? (checked.size / route.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Floor Ops</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Digital Picking Slip</h1>
        <p className="mt-1 text-sm text-steel-400">Route optimized by zone, aisle, rack, and shelf — pick top to bottom.</p>
      </header>

      <div className="mb-5 flex gap-2">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID"
          className="flex-1 rounded-md border border-graphite-600 bg-graphite-800 px-3 py-2.5 text-sm font-mono text-paper placeholder:text-steel-500 focus:border-signal-teal"
        />
        <button
          onClick={loadPickList}
          disabled={loading || !orderId.trim()}
          className="flex items-center gap-2 rounded-md bg-signal-teal px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
          Load
        </button>
      </div>

      {usingDemoData && pickList && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">
          Showing demo data — {error ?? "live API unreachable"}.
        </div>
      )}

      {!pickList && !loading && (
        <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
          <ClipboardCheck size={28} className="mx-auto mb-2 text-steel-500" />
          <p className="font-medium text-paper">Enter an order ID and load its pick list</p>
        </div>
      )}

      {pickList && pickList.shortages.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2.5 text-xs text-signal-red">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{pickList.shortages.length} item(s) short on stock</p>
            {pickList.shortages.map((s) => (
              <p key={s.sku}>
                {s.sku}: need {s.qtyRequested}, short by {s.qtyShort}
              </p>
            ))}
          </div>
        </div>
      )}

      {pickList && (
        <ul className="flex flex-col gap-2">
          {route.map((stop, idx) => (
            <PickRow
              key={stopKey(stop)}
              index={idx + 1}
              stop={stop}
              isChecked={checked.has(stopKey(stop))}
              onToggle={() => toggle(stop)}
            />
          ))}
        </ul>
      )}

      {pickList && route.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-graphite-700 bg-graphite-900/95 px-4 py-3 backdrop-blur md:sticky md:bottom-0 md:mt-6 md:rounded-lg md:border">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs text-steel-400">
                <span>{checked.size} of {route.length} picked</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-graphite-700">
                <div className="h-full rounded-full bg-signal-teal transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            {allPicked ? (
              <button className="flex items-center gap-2 rounded-md bg-signal-teal px-4 py-2.5 text-sm font-semibold text-graphite-950">
                <PackageCheck size={16} />
                Complete Pick
              </button>
            ) : (
              <button
                onClick={() => setChecked(new Set())}
                className="flex items-center gap-2 rounded-md border border-graphite-600 px-3 py-2.5 text-xs font-medium text-steel-400 hover:text-paper"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PickRow({ index, stop, isChecked, onToggle }: { index: number; stop: PickStop; isChecked: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
          isChecked ? "border-signal-teal-dim bg-signal-teal-dim/20" : "border-graphite-700 bg-graphite-900"
        }`}
      >
        <span className="w-5 shrink-0 text-center font-mono text-xs text-steel-500">{index}</span>

        {/* Large touch-target checkbox */}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            isChecked ? "border-signal-teal bg-signal-teal text-graphite-950" : "border-graphite-600"
          }`}
        >
          {isChecked && <PackageCheck size={16} strokeWidth={2.5} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${isChecked ? "text-steel-400 line-through" : "text-paper"}`}>{stop.partName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <BinTag code={stop.locationCode} size="sm" />
            {stop.category && <CategoryBadge category={stop.category} />}
            {stop.isHeavy && <WeightBadge isHeavy />}
          </div>
        </div>

        <span className="shrink-0 text-right">
          <span className="block font-mono text-lg font-semibold text-paper">{stop.qtyToPick}</span>
          <span className="block text-[10px] uppercase text-steel-500">qty</span>
        </span>
      </button>
    </li>
  );
}
