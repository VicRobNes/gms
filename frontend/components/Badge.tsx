import { titleCase } from '../lib/format';

interface BadgeProps {
  value: string;
  kind?: 'stage' | 'status' | 'priority';
}

export function Badge({ value, kind = 'status' }: BadgeProps) {
  return <span className={`badge ${kind}-${value}`}>{titleCase(value)}</span>;
}
