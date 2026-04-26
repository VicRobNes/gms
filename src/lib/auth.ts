import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { store } from './store.js';

export type AuthContext = {
  Variables: {
    organizationId: string;
    userId: string;
  };
};

export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  const header = c.req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing bearer token' });
  }

  const token = header.slice(7);
  const session = store.sessions.get(token);

  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  c.set('organizationId', session.organizationId);
  c.set('userId', session.userId);

  await next();
});
