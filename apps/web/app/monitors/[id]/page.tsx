'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Check, type Monitor } from '../../../lib/api';
import { LatencyChart } from '../../../components/LatencyChart';
import { StatusBadge } from '../../../components/StatusBadge';
import { formatUptime } from '../../../lib/format';

interface Detail {
  monitor: Monitor;
  summary: { uptimePct: number };
  checks: Check[];
}

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api<Monitor>(`/monitors/${params.id}`),
      api<{ summary: { uptimePct: number }; checks: Check[] }>(
        `/monitors/${params.id}/checks?limit=50`,
      ),
    ])
      .then(([monitor, detail]) => {
        setData({ monitor, ...detail });
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'));
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="rounded bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
        <Link className="text-sm underline" href="/">
          Voltar ao painel
        </Link>
      </main>
    );
  }

  if (!data) return <main className="p-6">Carregando…</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{data.monitor.name}</h1>
        <StatusBadge status={data.monitor.status} />
      </div>
      <p className="truncate text-sm text-neutral-500">{data.monitor.url}</p>
      <p className="text-sm">Uptime: {formatUptime(data.summary.uptimePct)}</p>
      <LatencyChart checks={data.checks} />
      <Link className="text-sm underline" href="/">
        Voltar ao painel
      </Link>
    </main>
  );
}
