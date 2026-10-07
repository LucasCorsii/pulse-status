import Link from 'next/link';
import { StatusBadge } from '../../components/StatusBadge';

const API_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getPublic() {
  const res = await fetch(`${API_BASE}/api/v1/status`, { cache: 'no-store' }).catch(() => null);
  if (!res || !res.ok)
    return { monitors: [] as Array<{ id: string; name: string; status: string }> };
  return (await res.json()) as { monitors: Array<{ id: string; name: string; status: string }> };
}

export default async function PublicStatusPage() {
  const data = await getPublic();
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Status público</h1>
      <ul className="space-y-2">
        {data.monitors.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded border p-3 dark:border-neutral-800"
          >
            <Link className="font-medium underline" href={`/status/${m.id}`}>
              {m.name}
            </Link>
            <StatusBadge status={m.status} />
          </li>
        ))}
      </ul>
      {data.monitors.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhum serviço público no momento.</p>
      )}
    </main>
  );
}
