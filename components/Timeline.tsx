import type { Activity } from '../lib/store';

const ICON: Record<Activity['type'], string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  meeting: '🗓️',
  log: '⚙️'
};

interface TimelineProps {
  items: Activity[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return <div className="empty">No activity yet.</div>;
  }
  return (
    <div className="timeline">
      {items.map((a) => (
        <div key={a.id} className="timeline-item">
          <div className="timeline-icon" aria-hidden>{ICON[a.type]}</div>
          <div className="timeline-body">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="timeline-type">{a.type}</span>
              <span className="timeline-at">{new Date(a.at).toLocaleString()}</span>
            </div>
            <div className="timeline-text">{a.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
