export interface HttpCheckResult {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
}

// Checagem HTTP com timeout e medição de latência. Retentativa é feita pelo BullMQ.
export async function httpCheck(url: string, timeoutMs: number): Promise<HttpCheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'pulse-status/1.0' },
    });
    const latencyMs = Date.now() - started;
    const ok = res.status >= 200 && res.status < 400;
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
  } finally {
    clearTimeout(timer);
  }
}
