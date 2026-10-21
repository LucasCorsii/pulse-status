import { summarizeChecks } from './uptime';

describe('summarizeChecks', () => {
  it('returns 100% when there are no checks', () => {
    expect(summarizeChecks([])).toMatchObject({ total: 0, uptimePct: 100 });
  });

  it('computes uptime and latency stats', () => {
    const summary = summarizeChecks([
      { result: 'SUCCESS', latencyMs: 100 },
      { result: 'SUCCESS', latencyMs: 200 },
      { result: 'FAILURE', latencyMs: null },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.up).toBe(2);
    expect(summary.down).toBe(1);
    expect(summary.uptimePct).toBeCloseTo(66.66, 1);
    expect(summary.avgLatencyMs).toBe(150);
  });
});
