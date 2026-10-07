const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Compat: a API agora define cookies HttpOnly (ps_access/ps_refresh) no login.
// O web prefere cookies (credentials:include); o Authorization Bearer é mantido
// apenas como fallback para clientes não-browser.
function getFallbackToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ps.access');
}

export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ps.access', accessToken);
  localStorage.setItem('ps.refresh', refreshToken);
}

export function getSocketToken(): string | null {
  return getFallbackToken();
}

export async function logout(): Promise<void> {
  try {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem('ps.refresh') : null;
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
    }).catch(() => undefined);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ps.access');
      localStorage.removeItem('ps.refresh');
    }
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const fallback = getFallbackToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(fallback ? { authorization: `Bearer ${fallback}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  status: 'UP' | 'DOWN' | 'PAUSED';
  isPublic: boolean;
}

export interface Check {
  id: string;
  result: 'SUCCESS' | 'FAILURE';
  statusCode: number | null;
  latencyMs: number | null;
  checkedAt: string;
}
