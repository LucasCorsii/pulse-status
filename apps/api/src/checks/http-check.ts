import { safeFetch } from '../common/ssrf';

export interface HttpCheckResult {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
}

// Checagem HTTP com timeout, medição de latência e política anti-SSRF.
// Retentativa é feita pelo BullMQ.
export async function httpCheck(url: string, timeoutMs: number): Promise<HttpCheckResult> {
  const started = Date.now();
  try {
    const res = await safeFetch(url, {
      timeoutMs,
      headers: { 'user-agent': 'pulse-status/1.0' },
    });
    const latencyMs = Date.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    await res.body?.cancel().catch(() => undefined);
    return {
      ok,
      statusCode: res.status,
      latencyMs,
      errorMessage: ok ? null : `Unexpected status ${res.status}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : 'fetch failed';
    return { ok: false, statusCode: null, latencyMs, errorMessage: message.slice(0, 500) };
  }
}
