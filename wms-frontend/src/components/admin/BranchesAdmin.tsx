import { useEffect, useState, type FormEvent } from "react";
import { Plus, Building2, Loader2, X } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { Branch } from "../../types";

export function BranchesAdmin() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .get<{ ok: true; branches: Branch[] }>("/api/branches")
      .then((r) => setBranches(r.branches))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load branches"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Structure</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Branches</h1>
          <p className="mt-1 text-sm text-steel-400">Each branch gets its own warehouse, staff, and reporting scope.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90"
        >
          <Plus size={16} />
          Add Branch
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {branches.map((b) => (
            <div key={b.code} className="flex items-center gap-3 rounded-lg border border-graphite-700 bg-graphite-900 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-graphite-700 text-signal-teal">
                <Building2 size={18} />
              </div>
              <div>
                <p className="font-medium text-paper">{b.name}</p>
                <p className="font-mono text-xs text-steel-400">{b.code}{b.city ? ` · ${b.city}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AddBranchModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddBranchModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: "", name: "", city: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/branches", form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create branch");
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
          <h2 className="font-display text-lg font-semibold">Add Branch</h2>
          <button type="button" onClick={onClose} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Branch Name">
            <input required placeholder="e.g. Bahir Dar Branch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Branch Code">
            <input required placeholder="e.g. BDR-01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input font-mono" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
          </Field>
          <Field label="Address (optional)">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </Field>
        </div>

        {error && <p className="mt-3 rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Add Branch
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
