'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveTokens } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await api<{ accessToken: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveTokens(data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no cadastro');
    }
  }

  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-bold">Criar conta</h1>
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} className="space-y-2">
        <input
          className="w-full rounded border p-2 dark:bg-neutral-900"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2 dark:bg-neutral-900"
          placeholder="senha (mín. 8)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          className="w-full rounded bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-black"
          type="submit"
        >
          Cadastrar
        </button>
      </form>
      <Link className="text-sm underline" href="/login">
        Já tenho conta
      </Link>
    </main>
  );
}
