export interface UptimeInput {
  result: 'SUCCESS' | 'FAILURE';
  latencyMs: number | null;
}

export interface UptimeSummary {
  total: number;
  up: number;
  down: number;
  uptimePct: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
}

export function summarizeChecks(checks: UptimeInput[]): UptimeSummary {
  const total = checks.length;
  const up = checks.filter((c) => c.result === 'SUCCESS').length;
  const down = total - up;
  const uptimePct = total === 0 ? 100 : (up / total) * 100;
  const latencies = checks
    .filter((c) => c.result === 'SUCCESS' && typeof c.latencyMs === 'number')
    .map((c) => c.latencyMs as number)
    .sort((a, b) => a - b);
  if (latencies.length === 0) {
    return { total, up, down, uptimePct, avgLatencyMs: null, p95LatencyMs: null };
  }
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))];
  return { total, up, down, uptimePct, avgLatencyMs: Math.round(avg), p95LatencyMs: p95 };
}
