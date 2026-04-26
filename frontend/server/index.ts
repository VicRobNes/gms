import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { api } from './modules/routes.js';

const app = new Hono();

const corsAllowlist = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (corsAllowlist.length === 0) return origin;
      return corsAllowlist.includes(origin) ? origin : corsAllowlist[0]!;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  })
);

app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', details: err.flatten() }, 400);
  }

  console.error('[api] unhandled error', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
