import { cookies } from 'next/headers';
import { db, type User } from './store';

const COOKIE = 'gms_user';

/**
 * Resolve the active user. Real auth lands later — for now we keep a
 * session as a single cookie and fall back to the first user when unset.
 */
export function getCurrentUser(): User {
  const id = cookies().get(COOKIE)?.value;
  const users = db.users.list();
  if (id) {
    const found = users.find((u) => u.id === id);
    if (found) return found;
  }
  return users[0]!;
}

export const CURRENT_USER_COOKIE = COOKIE;
