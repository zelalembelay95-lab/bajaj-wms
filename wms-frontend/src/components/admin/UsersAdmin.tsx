import { useEffect, useState, type FormEvent } from "react";
import { Plus, Loader2, X, ShieldCheck, Crown, Briefcase, UserCog, Pencil, KeyRound, Ban, RotateCcw, Trash2 } from "lucide-react";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [resettingUser, setResettingUser] = useState<AuthUser | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<AuthUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function toggleActive(user: AuthUser) {
    setBusyId(user._id);
    try {
      await api.put(`/api/users/${user._id}/${user.isActive ? "deactivate" : "reactivate"}`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update user");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: AuthUser) {
    setBusyId(user._id);
    try {
      await api.delete(`/api/users/${user._id}`);
      setConfirmingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete user");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Access</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Staff Logins</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
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
            const busy = busyId === u._id;
            return (
              <div
                key={u._id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
                  u.isActive ? "border-graphite-700 bg-graphite-900" : "border-graphite-800 bg-graphite-900/50 opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-paper">{u.name}</p>
                    {!u.isActive && (
                      <span className="rounded-full bg-graphite-700 px-2 py-0.5 text-[10px] font-medium text-steel-400">Deactivated</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-steel-400">
                    {u.email}
                    {u.branchCode && <span className="font-mono"> · {u.branchCode}</span>}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                    <meta.icon size={13} />
                    {u.jobTitle || meta.label}
                  </span>

                  <IconButton title="Edit" onClick={() => setEditingUser(u)}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton title="Reset password" onClick={() => setResettingUser(u)}>
                    <KeyRound size={14} />
                  </IconButton>
                  <IconButton
                    title={u.isActive ? "Deactivate" : "Reactivate"}
                    onClick={() => toggleActive(u)}
                    disabled={busy}
                    tone={u.isActive ? "warn" : "default"}
                  >
                    {u.isActive ? <Ban size={14} /> : <RotateCcw size={14} />}
                  </IconButton>
                  <IconButton title="Delete permanently" onClick={() => setConfirmingDelete(u)} tone="danger">
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddForm && (
        <AddUserModal branches={branches} onClose={() => setShowAddForm(false)} onCreated={() => { setShowAddForm(false); load(); }} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} branches={branches} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); load(); }} />
      )}
      {resettingUser && (
        <ResetPasswordModal user={resettingUser} onClose={() => setResettingUser(null)} onDone={() => setResettingUser(null)} />
      )}
      {confirmingDelete && (
        <ConfirmDeleteModal
          user={confirmingDelete}
          busy={busyId === confirmingDelete._id}
          onCancel={() => setConfirmingDelete(null)}
          onConfirm={() => deleteUser(confirmingDelete)}
        />
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass = {
    default: "text-steel-400 hover:text-paper hover:bg-graphite-700",
    warn: "text-steel-400 hover:text-signal-amber hover:bg-graphite-700",
    danger: "text-steel-400 hover:text-signal-red hover:bg-graphite-700",
  }[tone];
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
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
    <ModalShell title="Add Staff Login" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

        {error && <p className="rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting || (needsBranch && branches.length === 0)}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create Login
        </button>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  branches,
  onClose,
  onSaved,
}: {
  user: AuthUser;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle ?? "",
    branchCode: user.branchCode ?? branches[0]?.code ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsBranch = ROLE_META[form.role].needsBranch;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/api/users/${user._id}`, {
        name: form.name,
        email: form.email,
        role: form.role,
        jobTitle: form.jobTitle || undefined,
        branchCode: needsBranch ? form.branchCode : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Edit Staff Login" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Full Name">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </Field>
        <Field label="Email">
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
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
            <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="input" />
          </Field>
        </div>
        {needsBranch && (
          <Field label="Branch">
            <select value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} className="input">
              {branches.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </Field>
        )}

        {error && <p className="rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Save Changes
        </button>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({ user, onClose, onDone }: { user: AuthUser; onClose: () => void; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/api/users/${user._id}/reset-password`, { newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title={`Reset Password — ${user.name}`} onClose={onClose}>
      {done ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-md border border-signal-teal-dim bg-signal-teal-dim/20 px-3 py-2 text-sm text-signal-teal">
            Password updated. Give this new password to <strong>{user.name}</strong> directly (in person or by phone) —
            it won't be shown again here.
          </p>
          <button onClick={onDone} className="rounded-md bg-graphite-700 px-3 py-2.5 text-sm font-medium text-paper hover:bg-graphite-600">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="New Password">
            <input
              required
              type="text"
              minLength={8}
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input"
            />
          </Field>
          {error && <p className="rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-signal-amber px-3 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Set New Password
          </button>
        </form>
      )}
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  user,
  busy,
  onCancel,
  onConfirm,
}: {
  user: AuthUser;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="Delete Login Permanently" onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-steel-300">
          This permanently deletes <strong className="text-paper">{user.name}</strong>'s login (
          <span className="font-mono text-xs">{user.email}</span>). This cannot be undone.
        </p>
        <p className="text-xs text-steel-500">
          If this person has ever received stock, adjusted inventory, or picked an order, the system will refuse this
          and ask you to deactivate instead — deleting them would break the audit trail.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-md border border-graphite-600 px-3 py-2.5 text-sm font-medium text-steel-300 hover:bg-graphite-800">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-signal-red px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Delete Permanently
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-graphite-700 bg-graphite-900 p-5 shadow-panel md:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-steel-400 hover:text-paper">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
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
