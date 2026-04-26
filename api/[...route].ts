import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/index.js';

export const config = {
  runtime: 'nodejs'
};

const collectBody = (req: IncomingMessage): Promise<Buffer | undefined> => {
  if (!req.method || req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

const buildHeaders = (req: IncomingMessage): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }
  return headers;
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const host = req.headers.host ?? 'localhost';
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
    const url = `${proto}://${host}${req.url ?? '/'}`;
    const body = await collectBody(req);

    const request = new Request(url, {
      method: req.method,
      headers: buildHeaders(req),
      body: body && body.length > 0 ? new Uint8Array(body) : undefined
    });

    const response = await app.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    console.error('[api handler] unhandled error', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
