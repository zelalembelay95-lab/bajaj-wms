import { useEffect, useState, type FormEvent } from "react";
import { Plus, Bike, Loader2, X } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { Vehicle } from "../../types";
import { useAuth } from "../../context/AuthContext";

const MODEL_FAMILIES = ["Pulsar", "Discover", "Platina", "Avenger", "Dominar", "CT", "Boxer", "RE_Auto", "Qute"];
const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "text-signal-teal",
  ALLOCATED: "text-signal-amber",
  PDI_PENDING: "text-steel-300",
  IN_TRANSIT: "text-steel-300",
  DISPATCHED: "text-steel-500",
  DAMAGED: "text-signal-red",
  RETURNED: "text-signal-red",
};

export function VehiclesAdmin() {
  const { user } = useAuth();
  const canEdit = user?.role !== "executive";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .get<{ ok: true; vehicles: Vehicle[] }>("/api/vehicles")
      .then((r) => setVehicles(r.vehicles))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load vehicles"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Fleet</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Vehicles</h1>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90"
          >
            <Plus size={16} />
            Add Vehicle
          </button>
        )}
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
      ) : vehicles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
          <Bike size={28} className="mx-auto mb-2 text-steel-500" />
          <p className="font-medium text-paper">No vehicles yet</p>
          <p className="text-sm text-steel-500">Add the first unit to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-graphite-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-graphite-900 text-[11px] uppercase tracking-wide text-steel-400">
              <tr>
                <th className="px-4 py-3 font-medium">Chassis #</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Color</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-800">
              {vehicles.map((v) => (
                <tr key={v._id} className="bg-graphite-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-steel-300">{v.chassisNumber}</td>
                  <td className="px-4 py-3 text-paper">{v.variant}</td>
                  <td className="px-4 py-3 text-steel-300">{v.color}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_COLORS[v.status] ?? "text-steel-300"}`}>{v.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel-400">{v.locationCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AddVehicleModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    chassisNumber: "",
    engineNumber: "",
    modelFamily: "Pulsar",
    variant: "",
    vehicleType: "Motorcycle",
    color: "",
    productionYear: new Date().getFullYear(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/vehicles", form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create vehicle");
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
          <h2 className="font-display text-lg font-semibold">Add Vehicle</h2>
          <button type="button" onClick={onClose} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Chassis Number">
            <input required value={form.chassisNumber} onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })} className="input" />
          </Field>
          <Field label="Engine Number">
            <input required value={form.engineNumber} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Model Family">
              <select value={form.modelFamily} onChange={(e) => setForm({ ...form, modelFamily: e.target.value })} className="input">
                {MODEL_FAMILIES.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </select>
            </Field>
            <Field label="Vehicle Type">
              <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="input">
                <option value="Motorcycle">Motorcycle</option>
                <option value="Scooter">Scooter</option>
                <option value="ThreeWheeler">Three Wheeler</option>
              </select>
            </Field>
          </div>
          <Field label="Variant">
            <input required placeholder="e.g. Pulsar NS200" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color">
              <input required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" />
            </Field>
            <Field label="Production Year">
              <input
                required
                type="number"
                value={form.productionYear}
                onChange={(e) => setForm({ ...form, productionYear: Number(e.target.value) })}
                className="input"
              />
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
          Add Vehicle
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
