'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { api, clearTokens, type Monitor } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', intervalSec: 60 });

  async function load() {
    try {
      const data = await api<Monitor[]>('/monitors');
      setMonitors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar');
    }
  }

  useEffect(() => {
    void load();
    const socket = io(`${API_BASE}/events`, { transports: ['websocket'] });
    socket.on('monitor.status', () => void load());
    socket.on('incident.update', () => void load());
    return () => {
      socket.disconnect();
    };
  }, []);

  async function createMonitor(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/monitors', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', url: '', intervalSec: 60 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar');
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pulse Status — Painel</h1>
        <nav className="flex gap-3 text-sm">
          <Link className="underline" href="/status">
            Página pública
          </Link>
          <button
            className="underline"
            onClick={() => {
              clearTokens();
              window.location.href = '/login';
            }}
          >
            Sair
          </button>
        </nav>
      </header>

      {error && (
        <p className="rounded bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <form
        onSubmit={createMonitor}
        className="grid gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-4"
      >
        <input
          className="rounded border p-2 dark:bg-neutral-900"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded border p-2 dark:bg-neutral-900 sm:col-span-2"
          placeholder="https://exemplo.com"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          required
        />
        <button
          className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-black"
          type="submit"
        >
          Adicionar
        </button>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2">
        {monitors.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="truncate">{m.name}</strong>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-1 truncate text-sm text-neutral-500">{m.url}</p>
            <Link className="mt-3 inline-block text-sm underline" href={`/monitors/${m.id}`}>
              Ver latência e uptime
            </Link>
          </li>
        ))}
      </ul>
      {monitors.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhum monitor ainda. Adicione o primeiro acima.</p>
      )}
    </main>
  );
}
