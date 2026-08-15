import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiRequestError, clearStoredToken, getStoredToken, setOnUnauthorized, setStoredToken } from "../lib/apiClient";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearStoredToken();
      setUser(null);
    });
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreSession() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await api.get<{ ok: true; user: AuthUser }>("/api/auth/me");
      setUser(result.user);
    } catch {
      clearStoredToken();
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setError(null);
    try {
      const result = await api.post<{ ok: true; token: string; user: AuthUser }>("/api/auth/login", { email, password });
      setStoredToken(result.token);
      setUser(result.user);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Could not reach the server";
      setError(message);
      throw err;
    }
  }

  function logout() {
    clearStoredToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
