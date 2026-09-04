/**
 * Second service for the preview-origin reproduction.
 *
 * Answers every request with the headers it was handed, and does nothing else.
 * Its whole job is to make `Origin` visible on the far side of the preview
 * proxy, which is the only place the rewrite can be observed.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.ORIGIN_ECHO_PORT ?? 3005);

createServer((req, res) => {
  const body = JSON.stringify({ method: req.method, url: req.url, headers: req.headers }, null, 2);
  res.writeHead(200, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    // The proxy substitutes its own access-control-* headers on the way back;
    // these are here so the service is also usable without it.
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-credentials': 'true',
  });
  res.end(body);
}).listen(PORT, '0.0.0.0', () => console.log(`[origin-echo] listening on ${PORT}`));
