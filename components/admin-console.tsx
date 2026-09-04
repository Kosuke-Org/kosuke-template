'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * An ordinary admin screen against the API service: sign in, list the tenants,
 * show who is signed in. Nothing here knows it is a reproduction. What it looks
 * like when the proxy takes the calling service out of `Origin` is what the
 * screen does on its own, which is the whole point of it being a screen.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Tenant {
  id: string;
  name: string;
  plan: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

interface ApiError {
  status: number;
  name: string;
  message: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      name: body.name ?? 'Error',
      message: body.message ?? res.statusText,
    } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

export function AdminConsole() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUser(null);
    try {
      await call('/session', { method: 'POST' });
      const { tenants: rows } = await call<{ tenants: Tenant[] }>('/tenants');
      setTenants(rows);
      const { user: me } = await call<{ user: User }>('/me');
      setUser(me);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Signed in as</h2>
        {user ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {user.role}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
            <p className="font-medium text-red-500">We couldn’t load your profile.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.status} {error.name}: {error.message}
            </p>
            <button
              onClick={() => void load()}
              className="mt-3 rounded-md border px-3 py-1.5 text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">Loading…</div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Tenants</h2>
        <ul className="divide-y rounded-lg border">
          {(tenants ?? []).map((tenant) => (
            <li key={tenant.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-sm text-muted-foreground">{tenant.plan}</span>
            </li>
          ))}
          {!tenants && <li className="p-4 text-sm text-muted-foreground">Loading…</li>}
        </ul>
      </section>
    </main>
  );
}
