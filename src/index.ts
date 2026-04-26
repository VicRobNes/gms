import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { api } from './modules/routes.js';

const app = new Hono();

app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', details: err.flatten() }, 400);
  }

  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
