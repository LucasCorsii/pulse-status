'use client';

import type { Check } from '../lib/api';

export function LatencyChart({ checks }: { checks: Check[] }) {
  const points = [...checks].reverse().slice(-40);
  const values = points.map((c) => c.latencyMs ?? 0);
  const max = Math.max(1, ...values);
  const w = 400;
  const h = 120;
  const path = values
    .map((v, i) => {
      const x = values.length <= 1 ? w : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 10) - 5;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="mb-2 text-sm text-neutral-500">Latência (últimas {points.length} checagens)</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-28 w-full"
        role="img"
        aria-label="Gráfico de latência"
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}
