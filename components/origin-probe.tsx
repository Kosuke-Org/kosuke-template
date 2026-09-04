'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * What `Origin` the sibling service receives, seen from the browser.
 *
 * Two calls to the same echo service, differing only in the sandbox key in the
 * host. The baked one is what the app itself was configured with, and on a
 * warm-pool member that is the project key while this page is served under the
 * chat-session key. That difference is what makes the call cross-origin by the
 * preview proxy's definition, and so what triggers the Origin rewrite.
 *
 * The service segment is the thing to read. This page is served by `nextjs`, so
 * `nextjs` is what the echo service must report. `echo` means the rewrite has
 * replaced the caller with the target, which is the bug.
 */

const BAKED_ECHO_URL = process.env.NEXT_PUBLIC_ECHO_URL ?? '';

interface Probe {
  label: string;
  detail: string;
  url: string;
  received?: string;
  host?: string;
  referer?: string;
  error?: string;
}

/** The same echo service under this page's own sandbox key. */
function sameKeyEchoUrl(): string {
  const [hostname, port] = window.location.host.split(':');
  const [label, ...domain] = hostname.split('.');
  const key = label.split('--')[0];
  return `${window.location.protocol}//${key}--echo.${domain.join('.')}${port ? `:${port}` : ''}`;
}

async function callEcho(url: string): Promise<Partial<Probe>> {
  try {
    const res = await fetch(`${url}/origin-probe`, { credentials: 'include' });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = (await res.json()) as { headers?: Record<string, string> };
    return {
      received: body.headers?.origin ?? '(none sent)',
      host: body.headers?.host,
      referer: body.headers?.referer,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function serviceOf(origin?: string): string | null {
  if (!origin) return null;
  const match = origin.match(/\/\/[^.]*--([^.]+)\./);
  return match ? match[1] : null;
}

export function OriginProbe() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [running, setRunning] = useState(false);
  const [pageOrigin, setPageOrigin] = useState('');

  const run = useCallback(async () => {
    setRunning(true);
    const planned: Probe[] = [
      {
        label: 'baked URL (cross-key)',
        detail: 'NEXT_PUBLIC_ECHO_URL, as the app was configured',
        url: BAKED_ECHO_URL,
      },
      {
        label: 'this page’s own key',
        detail: 'same sandbox key as the page, so nothing to normalize',
        url: sameKeyEchoUrl(),
      },
    ];
    const done = await Promise.all(
      planned.map(async (probe) =>
        probe.url ? { ...probe, ...(await callEcho(probe.url)) } : { ...probe, error: 'not set' }
      )
    );
    setProbes(done);
    setRunning(false);
  }, []);

  useEffect(() => {
    setPageOrigin(window.location.origin);
    void run();
  }, [run]);

  const expected = serviceOf(pageOrigin);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8 font-mono text-sm">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Preview origin probe</h1>
        <p className="text-muted-foreground">
          This page is served by <strong>{expected ?? 'unknown'}</strong>. The echo service must
          report that same service in the Origin it receives.
        </p>
        <p className="text-muted-foreground break-all">page origin: {pageOrigin}</p>
      </header>

      <button
        onClick={() => void run()}
        disabled={running}
        className="rounded border px-3 py-1.5 disabled:opacity-50"
      >
        {running ? 'calling…' : 'call again'}
      </button>

      {probes.map((probe) => {
        const got = serviceOf(probe.received);
        const ok = got !== null && got === expected;
        return (
          <section key={probe.label} className="space-y-1 rounded border p-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-semibold">{probe.label}</h2>
              {probe.received ? (
                <span className={ok ? 'text-green-600' : 'text-red-600'}>
                  {ok ? 'PASS' : 'FAIL'}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground">{probe.detail}</p>
            <dl className="space-y-1 break-all">
              <div>
                <dt className="inline text-muted-foreground">called&nbsp;&nbsp;&nbsp;</dt>
                <dd className="inline">{probe.url || '(unset)'}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">origin&nbsp;&nbsp;&nbsp;</dt>
                <dd className="inline font-semibold">{probe.error ?? probe.received}</dd>
              </div>
              {probe.host ? (
                <div>
                  <dt className="inline text-muted-foreground">host&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</dt>
                  <dd className="inline">{probe.host}</dd>
                </div>
              ) : null}
              {probe.referer ? (
                <div>
                  <dt className="inline text-muted-foreground">referer&nbsp;&nbsp;</dt>
                  <dd className="inline">{probe.referer}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        );
      })}
    </main>
  );
}
