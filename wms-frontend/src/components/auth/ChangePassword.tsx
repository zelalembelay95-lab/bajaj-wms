import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

export function ChangePassword() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await api.put("/api/auth/change-password", { currentPassword, newPassword });
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Account</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Change Password</h1>
        <p className="mt-1 text-sm text-steel-400">{user?.email}</p>
      </header>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-signal-teal-dim bg-signal-teal-dim/20 px-3 py-2.5 text-sm text-signal-teal">
          <CheckCircle2 size={16} />
          Password updated. Use it next time you sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-graphite-700 bg-graphite-900 p-5 shadow-panel">
        <Field label="Current Password">
          <div className="relative">
            <input
              required
              type={show ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input pr-10"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300" tabIndex={-1}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Field label="New Password">
          <input required type={show ? "text" : "password"} minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
        </Field>

        <Field label="Confirm New Password">
          <input required type={show ? "text" : "password"} minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
        </Field>

        {error && <p className="rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          Update Password
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
