const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('focussive-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function notifyDataSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('focussive-sync'));
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const message =
      (body as { message?: string })?.message ??
      `API error ${res.status}`;

    // Auto-logout on 401 — stale/invalid token
    if (res.status === 401 && !skipAuth) {
      try {
        const raw = localStorage.getItem('focussive-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state) {
            parsed.state.accessToken = null;
            parsed.state.user = null;
            localStorage.setItem('focussive-auth', JSON.stringify(parsed));
          }
        }
      } catch { /* ignore */ }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    throw new ApiError(res.status, message, body);
  }

  // Broadcast live data sync for state mutating HTTP methods
  const method = (init.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    notifyDataSync();
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
