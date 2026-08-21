import { useEffect, useState, type FormEvent } from "react";
import { Plus, Loader2, X, ShieldCheck, Crown, Briefcase, UserCog } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { AuthUser, Branch, UserRole } from "../../types";

const ROLE_META: Record<UserRole, { label: string; icon: typeof ShieldCheck; className: string; needsBranch: boolean }> = {
  admin: { label: "Admin", icon: ShieldCheck, className: "bg-signal-amber-dim/40 text-signal-amber", needsBranch: false },
  executive: { label: "Executive", icon: Crown, className: "bg-signal-teal-dim/40 text-signal-teal", needsBranch: false },
  manager: { label: "Branch Manager", icon: Briefcase, className: "bg-graphite-700 text-paper", needsBranch: true },
  employee: { label: "Store Keeper", icon: UserCog, className: "bg-graphite-700 text-steel-300", needsBranch: true },
};

export function UsersAdmin() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    api.get<{ ok: true; branches: Branch[] }>("/api/branches").then((r) => setBranches(r.branches)).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    api
      .get<{ ok: true; users: AuthUser[] }>("/api/users")
      .then((r) => setUsers(r.users))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load users"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Access</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Staff Logins</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90"
        >
          <Plus size={16} />
          Add User
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const meta = ROLE_META[u.role];
            return (
              <div key={u._id} className="flex items-center justify-between rounded-lg border border-graphite-700 bg-graphite-900 p-4">
                <div>
                  <p className="font-medium text-paper">{u.name}</p>
                  <p className="text-xs text-steel-400">
                    {u.email}
                    {u.branchCode && <span className="font-mono"> · {u.branchCode}</span>}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                  <meta.icon size={13} />
                  {u.jobTitle || meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <AddUserModal branches={branches} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AddUserModal({ branches, onClose, onCreated }: { branches: Branch[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    jobTitle: "",
    branchCode: branches[0]?.code ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsBranch = ROLE_META[form.role].needsBranch;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        jobTitle: form.jobTitle || undefined,
        branchCode: needsBranch ? form.branchCode : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create user");
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
          <h2 className="font-display text-lg font-semibold">Add Staff Login</h2>
          <button type="button" onClick={onClose} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Full Name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Temporary Password">
            <input required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="input">
                <option value="employee">Store Keeper</option>
                <option value="manager">Branch Manager</option>
                <option value="executive">Executive (CEO/COO)</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Job Title (optional)">
              <input placeholder="e.g. CEO, COO" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="input" />
            </Field>
          </div>
          {needsBranch && (
            <Field label="Branch">
              <select value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} className="input">
                {branches.length === 0 && <option value="">No branches yet — create one first</option>}
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {error && <p className="mt-3 rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting || (needsBranch && branches.length === 0)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create Login
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
