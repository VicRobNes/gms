import type { Activity, User } from '../lib/store';

const ICON: Record<Activity['type'], string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  meeting: '🗓️',
  log: '⚙️'
};

interface TimelineProps {
  items: Activity[];
  userById?: Map<string, User>;
}

export function Timeline({ items, userById }: TimelineProps) {
  if (items.length === 0) {
    return <div className="empty">No activity yet.</div>;
  }
  return (
    <div className="timeline">
      {items.map((a) => {
        const actor = a.actorId ? userById?.get(a.actorId) : undefined;
        return (
          <div key={a.id} className="timeline-item">
            <div className="timeline-icon" aria-hidden>{ICON[a.type]}</div>
            <div className="timeline-body">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <span className="timeline-type">
                  {a.type}
                  {actor && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>· {actor.name}</span>}
                </span>
                <span className="timeline-at">{new Date(a.at).toLocaleString()}</span>
              </div>
              <div className="timeline-text">{a.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
