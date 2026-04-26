import Link from 'next/link';
import { db, initStore, type ActivityType } from '../../lib/store';

export const dynamic = 'force-dynamic';

const TYPES: ActivityType[] = ['note', 'call', 'email', 'meeting', 'log'];

const ICON: Record<ActivityType, string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  meeting: '🗓️',
  log: '⚙️'
};

interface PageProps {
  searchParams: { type?: string; user?: string; mine?: string };
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  await initStore();

  const all = db.activities.list();
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));
  const partyById = new Map(db.parties.list().map((p) => [p.id, p]));
  const oppById = new Map(db.opportunities.list().map((o) => [o.id, o]));

  const typeFilter = TYPES.find((t) => t === searchParams.type);
  const userFilter = searchParams.user;

  let items = all;
  if (typeFilter) items = items.filter((a) => a.type === typeFilter);
  if (userFilter) items = items.filter((a) => a.actorId === userFilter);

  const counts = TYPES.reduce<Record<ActivityType, number>>(
    (acc, t) => { acc[t] = all.filter((a) => a.type === t).length; return acc; },
    { note: 0, call: 0, email: 0, meeting: 0, log: 0 }
  );

  const buildHref = (next: { type?: string | null; user?: string | null }) => {
    const params = new URLSearchParams();
    const t = next.type === null ? undefined : next.type ?? typeFilter;
    if (t) params.set('type', t);
    const u = next.user === null ? undefined : next.user ?? userFilter;
    if (u) params.set('user', u);
    const qs = params.toString();
    return qs ? `/activities?${qs}` : '/activities';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Activity</h1>
          <p className="subtitle">{items.length} of {all.length} entries</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <Link href={buildHref({ type: null })} className={`btn ${!typeFilter ? 'btn-primary' : ''}`}>
          All <span style={{ marginLeft: 6, opacity: 0.7 }}>({all.length})</span>
        </Link>
        {TYPES.map((t) => (
          <Link key={t} href={buildHref({ type: t })} className={`btn ${typeFilter === t ? 'btn-primary' : ''}`}>
            {ICON[t]} {t} <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[t]})</span>
          </Link>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={buildHref({ user: null })} className={`btn ${!userFilter ? 'btn-primary' : ''}`}>
          Everyone
        </Link>
        {users.map((u) => (
          <Link key={u.id} href={buildHref({ user: u.id })} className={`btn ${userFilter === u.id ? 'btn-primary' : ''}`}>
            {u.name}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty">No activity matches the current filters.</div>
      ) : (
        <div className="timeline">
          {items.map((a) => {
            const actor = a.actorId ? userById.get(a.actorId) : undefined;
            const party = a.partyId ? partyById.get(a.partyId) : undefined;
            const opp = a.opportunityId ? oppById.get(a.opportunityId) : undefined;
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
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                    {opp && <Link href={`/opportunities/${opp.id}`} className="link">{opp.title}</Link>}
                    {opp && party && <span> · </span>}
                    {party && <Link href={`/parties/${party.id}`} className="link">{party.name}</Link>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
