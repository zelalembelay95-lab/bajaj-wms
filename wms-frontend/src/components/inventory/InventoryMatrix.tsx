import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, GitCompareArrows, PackageSearch } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import { DEMO_MATRIX_ROWS } from "../../lib/mockData";
import type { CompatibilityMatrixRow } from "../../types";
import { CategoryBadge, WeightBadge } from "../shared/Badges";
import { BinTag } from "../shared/BinTag";

const BAJAJ_MODELS = [
  "Pulsar 150",
  "Pulsar NS200",
  "Pulsar 220F",
  "Discover 110",
  "Discover 125",
  "Platina 100",
  "Avenger Cruise 220",
  "Dominar 400",
  "CT 100",
  "Boxer",
  "RE Compact 4S",
];

export function InventoryMatrix({ onApiHealth }: { onApiHealth: (ok: boolean) => void }) {
  const [model, setModel] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CompatibilityMatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const hasSearched = model.trim().length > 0 || query.trim().length > 0;

  useEffect(() => {
    if (!hasSearched) {
      setRows([]);
      return;
    }
    const handle = setTimeout(() => runSearch(), 300); // debounce keystrokes
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, query]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (model.trim()) params.set("model", model.trim());
      if (query.trim()) params.set("q", query.trim());
      const result = await api.get<{ ok: boolean; rows: CompatibilityMatrixRow[] }>(
        `/api/inventory/search?${params.toString()}`
      );
      setRows(result.rows);
      setUsingDemoData(false);
      onApiHealth(true);
    } catch (err) {
      // Live endpoint not reachable — fall back to filtered demo data so the
      // view stays usable, and surface that clearly rather than hiding it.
      onApiHealth(false);
      setUsingDemoData(true);
      const needle = query.trim().toLowerCase();
      setRows(
        DEMO_MATRIX_ROWS.filter(
          (r) =>
            (!needle ||
              r.partName.toLowerCase().includes(needle) ||
              r.oemPartNumber.toLowerCase().includes(needle) ||
              r.sku.toLowerCase().includes(needle) ||
              r.crossReferences.some((x) => x.refPartNumber.toLowerCase().includes(needle))) &&
            (!model.trim() || true) // demo rows aren't fitment-tagged; model filter is a no-op here
        )
      );
      setError(err instanceof ApiRequestError ? err.message : "Could not reach the inventory API.");
    } finally {
      setLoading(false);
    }
  }

  const toggleExpanded = (sku: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Inventory</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Compatibility Matrix</h1>
        <p className="mt-1 text-sm text-steel-400">
          Look up a Bajaj model to see every spare part that fits it, with live stock and OEM cross-references.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-graphite-700 bg-graphite-900 p-3 shadow-panel md:flex-row md:items-center">
        <div className="relative flex-1">
          <PackageSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={18} />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none rounded-md border border-graphite-600 bg-graphite-800 py-2.5 pl-10 pr-8 text-sm text-paper focus:border-signal-teal"
          >
            <option value="">All models</option>
            {BAJAJ_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="OEM part #, SKU, or part name…"
            className="w-full rounded-md border border-graphite-600 bg-graphite-800 py-2.5 pl-10 pr-3 text-sm text-paper placeholder:text-steel-500 focus:border-signal-teal"
          />
        </div>
      </div>

      {usingDemoData && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">
          Showing demo data — {error ?? "live API unreachable"}.
        </div>
      )}

      {!hasSearched && <EmptyState />}
      {hasSearched && loading && <LoadingRows />}
      {hasSearched && !loading && rows.length === 0 && <NoResults />}

      {hasSearched && !loading && rows.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-graphite-700 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-graphite-900 text-[11px] uppercase tracking-wide text-steel-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Part</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">OEM # / SKU</th>
                  <th className="px-4 py-3 font-medium">Cross-Refs</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Bin(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {rows.map((row) => (
                  <MatrixRow key={row.sku} row={row} expanded={expanded.has(row.sku)} onToggle={() => toggleExpanded(row.sku)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/tablet cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <MatrixCard key={row.sku} row={row} expanded={expanded.has(row.sku)} onToggle={() => toggleExpanded(row.sku)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatrixRow({ row, expanded, onToggle }: { row: CompatibilityMatrixRow; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="bg-graphite-900/40 align-top">
        <td className="px-4 py-3">
          <p className="font-medium text-paper">{row.partName}</p>
          {row.isHeavy && <span className="mt-1 inline-block"><WeightBadge isHeavy /></span>}
        </td>
        <td className="px-4 py-3">
          <CategoryBadge category={row.category} />
        </td>
        <td className="px-4 py-3 font-mono text-xs text-steel-300">
          <p>{row.oemPartNumber}</p>
          <p className="text-steel-500">{row.sku}</p>
        </td>
        <td className="px-4 py-3">
          {row.crossReferences.length === 0 ? (
            <span className="text-xs text-steel-500">—</span>
          ) : (
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-xs font-medium text-signal-teal hover:underline"
            >
              <GitCompareArrows size={13} />
              {row.crossReferences.length} linked {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          <AvailableQtyPill qty={row.totalAvailableQty} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {row.locations.map((loc) => (
              <BinTag key={loc.locationCode} code={loc.locationCode} zoneType={loc.zoneType} size="sm" />
            ))}
          </div>
        </td>
      </tr>
      {expanded && row.crossReferences.length > 0 && (
        <tr className="bg-graphite-900/70">
          <td colSpan={6} className="px-4 py-3">
            <CrossRefList row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

function MatrixCard({ row, expanded, onToggle }: { row: CompatibilityMatrixRow; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-4 shadow-panel">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-paper">{row.partName}</p>
          <p className="font-mono text-xs text-steel-400">{row.oemPartNumber} · {row.sku}</p>
        </div>
        <AvailableQtyPill qty={row.totalAvailableQty} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={row.category} />
        {row.isHeavy && <WeightBadge isHeavy />}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {row.locations.map((loc) => (
          <BinTag key={loc.locationCode} code={loc.locationCode} zoneType={loc.zoneType} size="sm" />
        ))}
      </div>
      {row.crossReferences.length > 0 && (
        <>
          <button onClick={onToggle} className="flex items-center gap-1 text-xs font-medium text-signal-teal">
            <GitCompareArrows size={13} />
            {row.crossReferences.length} cross-referenced number{row.crossReferences.length > 1 ? "s" : ""}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {expanded && <div className="mt-2"><CrossRefList row={row} /></div>}
        </>
      )}
    </div>
  );
}

function CrossRefList({ row }: { row: CompatibilityMatrixRow }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {row.crossReferences.map((xref) => (
        <li key={xref.refPartNumber} className="flex items-center gap-2 text-xs">
          <span className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono text-steel-300">{xref.refPartNumber}</span>
          <span className="text-steel-500">{formatRelationship(xref.relationship)}</span>
        </li>
      ))}
    </ul>
  );
}

function formatRelationship(rel: string) {
  return { SUPERSEDED_BY: "superseded by this part", SUPERSEDES: "supersedes this part", ALTERNATE: "interchangeable alternate", AFTERMARKET_EQUIVALENT: "aftermarket equivalent" }[rel] ?? rel;
}

function AvailableQtyPill({ qty }: { qty: number }) {
  const color = qty === 0 ? "text-signal-red" : qty < 10 ? "text-signal-amber" : "text-signal-teal";
  return (
    <span className={`font-mono text-sm font-semibold ${color}`}>
      {qty} <span className="text-[10px] font-normal text-steel-500">avail</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-graphite-700 py-16 text-center">
      <PackageSearch size={32} className="text-steel-500" />
      <p className="font-medium text-paper">Pick a model or start typing a part number</p>
      <p className="max-w-sm text-sm text-steel-500">
        Results include every part fitted to that model, plus superseded and aftermarket cross-reference numbers.
      </p>
    </div>
  );
}

function NoResults() {
  return (
    <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
      <p className="font-medium text-paper">No matching parts</p>
      <p className="text-sm text-steel-500">Try a different model or check the part number for typos.</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
      ))}
    </div>
  );
}
