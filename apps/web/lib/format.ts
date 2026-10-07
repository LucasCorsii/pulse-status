export function formatUptime(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

export function statusColor(status: string): string {
  if (status === 'UP') return 'bg-emerald-500';
  if (status === 'DOWN') return 'bg-red-500';
  return 'bg-neutral-400';
}
