'use client';

import { STAGES, type Stage } from '../../lib/store';

interface StageSelectProps {
  defaultValue: Stage;
  name?: string;
}

export function StageSelect({ defaultValue, name = 'stage' }: StageSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
