const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const TOKEN_STORAGE_KEY = "wms_token";

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Called whenever a request comes back 401 — lets AuthContext force a logout/redirect. */
let onUnauthorized: () => void = () => {};
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const token = getStoredToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    throw new ApiRequestError(res.status, body?.error ?? `Request failed (${res.status})`, body?.code);
  }
  return body as TResponse;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
};
