import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Timeline } from '../../../components/Timeline';
import { db, type ActivityType } from '../../../lib/store';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  params: { id: string };
}

async function addActivity(formData: FormData) {
  'use server';
  const partyId = String(formData.get('partyId') ?? '');
  const type = (String(formData.get('type') ?? 'note') as ActivityType);
  const body = String(formData.get('body') ?? '').trim();
  if (!partyId || !body) return;
  db.activities.create({
    type,
    partyId,
    body,
    at: new Date().toISOString()
  });
  revalidatePath(`/parties/${partyId}`);
  revalidatePath('/parties');
}

export default function PartyDetailPage({ params }: PageProps) {
  const party = db.parties.get(params.id);
  if (!party) notFound();

  const allParties = db.parties.list();
  const partyById = new Map(allParties.map((p) => [p.id, p]));
  const org = party.organizationId ? partyById.get(party.organizationId) : undefined;

  const opps = db.opportunities.list().filter((o) => o.partyId === party.id);
  const pipelines = db.pipelines.list();
  const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
  const activities = db.activities.list({ partyId: party.id });

  const members = party.kind === 'organization'
    ? allParties.filter((p) => p.kind === 'person' && p.organizationId === party.id)
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{party.name}</h1>
          <p className="subtitle">
            <span className="badge" style={{ marginRight: 6 }}>{party.kind}</span>
            {party.email ?? 'no email'}
          </p>
        </div>
        <Link href="/parties" className="btn btn-ghost">← Parties</Link>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Activity</div>
            <form action={addActivity} style={{ marginBottom: 16 }}>
              <input type="hidden" name="partyId" value={party.id} />
              <div className="form-grid">
                <div className="field" style={{ flex: '0 0 140px' }}>
                  <label htmlFor="t">Type</label>
                  <select id="t" name="type" defaultValue="note">
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="b">Body</label>
                  <textarea id="b" name="body" required placeholder="What happened?" />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn btn-primary">Log activity</button>
              </div>
            </form>
            <Timeline items={activities} />
          </div>
        </div>

        <aside>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Details</div>
            <dl className="detail-meta">
              <dt>Kind</dt><dd>{party.kind}</dd>
              <dt>Email</dt><dd>{party.email ?? '—'}</dd>
              <dt>Phone</dt><dd>{party.phone ?? '—'}</dd>
              {party.kind === 'person' && (
                <>
                  <dt>Works at</dt>
                  <dd>{org ? <Link href={`/parties/${org.id}`} className="link">{org.name}</Link> : '—'}</dd>
                </>
              )}
              {party.kind === 'organization' && (
                <>
                  <dt>People</dt>
                  <dd>{members.length}</dd>
                </>
              )}
              <dt>Added</dt><dd>{new Date(party.createdAt).toLocaleDateString()}</dd>
            </dl>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Opportunities ({opps.length})</div>
            {opps.length === 0 ? (
              <div className="empty" style={{ padding: 12 }}>No opportunities.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opps.map((o) => {
                  const pipeline = pipelineById.get(o.pipelineId);
                  return (
                    <Link key={o.id} href={`/opportunities/${o.id}`} className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{o.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatCurrency(o.amount)} · {o.stage}
                        {pipeline && pipeline.id !== db.pipelines.default().id ? ` (${pipeline.name})` : ''}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {party.kind === 'organization' && members.length > 0 && (
            <div className="card">
              <div className="section-title">Members</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.map((m) => (
                  <Link key={m.id} href={`/parties/${m.id}`} className="row between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email ?? '—'}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
