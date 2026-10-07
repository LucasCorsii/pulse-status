import { LatencyChart } from '../../../components/LatencyChart';
import { StatusBadge } from '../../../components/StatusBadge';
import { formatUptime } from '../../../lib/format';
import type { Check } from '../../../lib/api';

const API_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getDetail(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/status/${id}`, { cache: 'no-store' }).catch(
    () => null,
  );
  if (!res || !res.ok) return null;
  return (await res.json()) as {
    monitor: { id: string; name: string; status: string };
    summary: { uptimePct: number; avgLatencyMs: number | null };
    checks: Check[];
  };
}

export default async function StatusDetailPage({ params }: { params: { id: string } }) {
  const data = await getDetail(params.id);
  if (!data) return <main className="p-6">Página de status não encontrada.</main>;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{data.monitor.name}</h1>
        <StatusBadge status={data.monitor.status} />
      </div>
      <p className="text-sm text-neutral-500">Uptime: {formatUptime(data.summary.uptimePct)}</p>
      <LatencyChart checks={data.checks} />
    </main>
  );
}
