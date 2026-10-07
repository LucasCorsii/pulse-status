import { statusColor } from '../lib/format';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-800">
      <span className={`h-2.5 w-2.5 rounded-full ${statusColor(status)}`} />
      {status}
    </span>
  );
}
