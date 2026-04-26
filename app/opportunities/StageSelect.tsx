'use client';

interface StageSelectProps {
  defaultValue: string;
  stages: string[];
  name?: string;
}

export function StageSelect({ defaultValue, stages, name = 'stage' }: StageSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {stages.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
