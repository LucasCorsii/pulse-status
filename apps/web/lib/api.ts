const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('ps.access'),
    refreshToken: localStorage.getItem('ps.refresh'),
  };
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('ps.access', accessToken);
  localStorage.setItem('ps.refresh', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('ps.access');
  localStorage.removeItem('ps.refresh');
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
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
