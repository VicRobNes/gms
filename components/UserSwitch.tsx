'use client';

import type { User } from '../lib/store';

interface UserSwitchProps {
  users: User[];
  currentId: string;
  action: (formData: FormData) => void;
}

/**
 * Sidebar select that switches the active user. Auto-submits on change so
 * the user doesn't need an extra "save" click.
 */
export function UserSwitch({ users, currentId, action }: UserSwitchProps) {
  return (
    <form action={action}>
      <label
        htmlFor="user-switch"
        style={{ display: 'block', fontSize: 11, color: '#8b92a7', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}
      >
        Switch user
      </label>
      <select
        id="user-switch"
        name="id"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          color: '#f4f6fb',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 12.5
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id} style={{ color: '#1c2333' }}>
            {u.name}
          </option>
        ))}
      </select>
    </form>
  );
}
