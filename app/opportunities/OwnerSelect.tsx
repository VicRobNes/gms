'use client';

import type { User } from '../../lib/store';

interface OwnerSelectProps {
  users: User[];
  defaultValue: string | undefined;
  name?: string;
}

export function OwnerSelect({ users, defaultValue, name = 'ownerId' }: OwnerSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      <option value="">— unassigned —</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
