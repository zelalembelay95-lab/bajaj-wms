import { useEffect, useState, type FormEvent } from "react";
import { Plus, PackageSearch, Loader2, X } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { SparePartRecord } from "../../types";
import { CategoryBadge } from "../shared/Badges";

const CATEGORIES = [
  "Engine", "Electrical", "Braking", "Body", "Suspension", "Transmission",
  "Fuel_System", "Exhaust", "Fasteners_Consumables", "Tyres_Wheels", "Accessories",
] as const;

const ZONE_TYPES = [
  "BULK_FLOOR_STORAGE", "PALLET_RACKING", "HIGH_DENSITY_MICRO_BIN", "SHELVING_STANDARD",
  "HAZMAT_CAGE", "STAGING_OUTBOUND", "STAGING_INBOUND", "RETURNS_QUARANTINE",
] as const;

export function SparePartsAdmin() {
  const [parts, setParts] = useState<SparePartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .get<{ ok: true; parts: SparePartRecord[] }>("/api/spare-parts")
      .then((r) => setParts(r.parts))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load spare parts"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Catalog</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Spare Parts</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90"
        >
          <Plus size={16} />
          Add Part
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
          <PackageSearch size={28} className="mx-auto mb-2 text-steel-500" />
          <p className="font-medium text-paper">No spare parts in the catalog yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-graphite-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-graphite-900 text-[11px] uppercase tracking-wide text-steel-400">
              <tr>
                <th className="px-4 py-3 font-medium">Part</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">OEM # / SKU</th>
                <th className="px-4 py-3 font-medium">Default Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-800">
              {parts.map((p) => (
                <tr key={p._id} className="bg-graphite-900/40">
                  <td className="px-4 py-3 text-paper">{p.partName}</td>
                  <td className="px-4 py-3"><CategoryBadge category={p.category} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-steel-300">
                    <p>{p.oemPartNumber}</p>
                    <p className="text-steel-500">{p.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-steel-400">{p.defaultZoneType.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AddPartModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddPartModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    sku: "",
    oemPartNumber: "",
    partName: "",
    category: "Engine",
    unitOfMeasure: "EA",
    defaultZoneType: "SHELVING_STANDARD",
    minThreshold: 10,
    maxThreshold: 100,
    reorderQty: 50,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/spare-parts", {
        sku: form.sku,
        oemPartNumber: form.oemPartNumber,
        partName: form.partName,
        category: form.category,
        unitOfMeasure: form.unitOfMeasure,
        defaultZoneType: form.defaultZoneType,
        reorderPolicy: { minThreshold: form.minThreshold, maxThreshold: form.maxThreshold, reorderQty: form.reorderQty },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create spare part");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-xl border border-graphite-700 bg-graphite-900 p-5 shadow-panel md:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Add Spare Part</h2>
          <button type="button" onClick={onClose} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Part Name">
            <input required value={form.partName} onChange={(e) => setForm({ ...form, partName: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
            </Field>
            <Field label="OEM Part #">
              <input required value={form.oemPartNumber} onChange={(e) => setForm({ ...form, oemPartNumber: e.target.value })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </Field>
            <Field label="Default Zone">
              <select value={form.defaultZoneType} onChange={(e) => setForm({ ...form, defaultZoneType: e.target.value })} className="input">
                {ZONE_TYPES.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min">
              <input type="number" value={form.minThreshold} onChange={(e) => setForm({ ...form, minThreshold: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Max">
              <input type="number" value={form.maxThreshold} onChange={(e) => setForm({ ...form, maxThreshold: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Reorder Qty">
              <input type="number" value={form.reorderQty} onChange={(e) => setForm({ ...form, reorderQty: Number(e.target.value) })} className="input" />
            </Field>
          </div>
        </div>

        {error && <p className="mt-3 rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Add Part
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-steel-400">{label}</span>
      {children}
    </label>
  );
}
