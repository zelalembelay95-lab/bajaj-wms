import { useState, type FormEvent } from "react";
import { Warehouse, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-signal-amber text-graphite-950">
            <Warehouse size={26} strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-xl font-semibold text-paper">Bajaj WMS</h1>
          <p className="text-sm text-steel-400">Pune Distribution Center</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-graphite-700 bg-graphite-900 p-6 shadow-panel"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-steel-400">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@bajajwms.local"
              className="w-full rounded-md border border-graphite-600 bg-graphite-800 px-3 py-2.5 text-sm text-paper placeholder:text-steel-500 focus:border-signal-teal"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-steel-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-graphite-600 bg-graphite-800 px-3 py-2.5 pr-10 text-sm text-paper placeholder:text-steel-500 focus:border-signal-teal"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-500 hover:text-steel-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-signal-red-dim bg-signal-red-dim/20 px-3 py-2 text-xs text-signal-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-md bg-signal-amber px-4 py-2.5 text-sm font-semibold text-graphite-950 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-steel-500">
          Accounts are created by an admin — there's no public sign-up for a staff-only system.
        </p>
      </div>
    </div>
  );
}
