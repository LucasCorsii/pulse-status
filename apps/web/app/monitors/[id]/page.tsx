'use client';

import { useEffect, useState } from 'react';
import { api, type Check } from '../../../lib/api';
import { LatencyChart } from '../../../components/LatencyChart';
import { StatusBadge } from '../../../components/StatusBadge';
import { formatUptime } from '../../../lib/format';

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{
    summary: { uptimePct: number };
    checks: Check[];
  } | null>(null);

  useEffect(() => {
    void api<{ summary: { uptimePct: number }; checks: Check[] }>(
      `/monitors/${params.id}/checks?limit=50`,
    )
      .then(setData)
      .catch(() => setData(null));
  }, [params.id]);

  if (!data) return <main className="p-6">Carregando…</main>;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <StatusBadge status="UP" />
      <p className="text-sm">Uptime: {formatUptime(data.summary.uptimePct)}</p>
      <LatencyChart checks={data.checks} />
    </main>
  );
}
