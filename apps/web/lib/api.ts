const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// A API autentica por cookies HttpOnly (ps_access/ps_refresh); nenhum token é
// acessível a JavaScript. O web envia `credentials: include` em todas as chamadas.

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

// Renova o par de cookies quando o access token expira e repete a chamada uma vez.
async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }).catch(() => null);
  return Boolean(res?.ok);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await request(path, init);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await request(path, init);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
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
