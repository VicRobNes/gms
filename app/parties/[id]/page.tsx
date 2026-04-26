import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Timeline } from '../../../components/Timeline';
import { TaskList } from '../../../components/TaskList';
import { db, initStore, persistStore, type ActivityType } from '../../../lib/store';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  params: { id: string };
}

async function addActivity(formData: FormData) {
  'use server';
  await initStore();
  const partyId = String(formData.get('partyId') ?? '');
  const type = (String(formData.get('type') ?? 'note') as ActivityType);
  const body = String(formData.get('body') ?? '').trim();
  if (!partyId || !body) return;
  const me = getCurrentUser();
  db.activities.create({
    type,
    partyId,
    actorId: me.id,
    body,
    at: new Date().toISOString()
  });
  await persistStore();
  revalidatePath(`/parties/${partyId}`);
  revalidatePath('/parties');
}

async function addTask(formData: FormData) {
  'use server';
  await initStore();
  const partyId = String(formData.get('partyId') ?? '');
  const opportunityId = String(formData.get('opportunityId') ?? '') || undefined;
  const title = String(formData.get('title') ?? '').trim();
  const due = String(formData.get('due') ?? '').trim();
  const assigneeId = String(formData.get('assigneeId') ?? '') || undefined;
  if (!partyId || !title || !due) return;
  db.tasks.create({ title, due, partyId, opportunityId, assigneeId });
  await persistStore();
  revalidatePath(`/parties/${partyId}`);
  revalidatePath('/tasks');
  revalidatePath('/');
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

async function toggleTask(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const me = getCurrentUser();
  const t = db.tasks.toggleDone(id, me.id);
  await persistStore();
  revalidatePath('/tasks');
  revalidatePath('/');
  if (t?.partyId) revalidatePath(`/parties/${t.partyId}`);
  if (t?.opportunityId) revalidatePath(`/opportunities/${t.opportunityId}`);
}

async function updateParty(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim() || undefined;
  const phone = String(formData.get('phone') ?? '').trim() || undefined;
  const organizationIdRaw = String(formData.get('organizationId') ?? '').trim();
  const organizationId = organizationIdRaw || undefined;
  if (!name) return;
  db.parties.update(id, { name, email, phone, organizationId });
  await persistStore();
  revalidatePath(`/parties/${id}`);
  revalidatePath('/parties');
  revalidatePath('/');
}

async function deleteTask(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const t = db.tasks.get(id);
  db.tasks.delete(id);
  await persistStore();
  revalidatePath('/tasks');
  revalidatePath('/');
  if (t?.partyId) revalidatePath(`/parties/${t.partyId}`);
  if (t?.opportunityId) revalidatePath(`/opportunities/${t.opportunityId}`);
}

export default async function PartyDetailPage({ params }: PageProps) {
  await initStore();
  const party = db.parties.get(params.id);
  if (!party) notFound();

  const allParties = db.parties.list();
  const partyById = new Map(allParties.map((p) => [p.id, p]));
  const org = party.organizationId ? partyById.get(party.organizationId) : undefined;

  const me = getCurrentUser();
  const opps = db.opportunities.list().filter((o) => o.partyId === party.id);
  const oppById = new Map(opps.map((o) => [o.id, o]));
  const pipelines = db.pipelines.list();
  const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));
  const activities = db.activities.list({ partyId: party.id });
  const tasks = db.tasks.list({ partyId: party.id });
  const dateOffset = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

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
            <div className="section-title">Tasks</div>
            <form action={addTask} style={{ marginBottom: 16 }}>
              <input type="hidden" name="partyId" value={party.id} />
              <div className="form-grid">
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="task-title">Title</label>
                  <input id="task-title" className="input" name="title" required />
                </div>
                <div className="field">
                  <label htmlFor="task-due">Due</label>
                  <input id="task-due" className="input" type="date" name="due" defaultValue={dateOffset(1)} required />
                </div>
                <div className="field">
                  <label htmlFor="task-opp">Opportunity</label>
                  <select id="task-opp" name="opportunityId" defaultValue="">
                    <option value="">— none —</option>
                    {opps.map((o) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="task-assignee">Assignee</label>
                  <select id="task-assignee" name="assigneeId" defaultValue={me.id}>
                    <option value="">— unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn btn-primary">Add task</button>
              </div>
            </form>
            <TaskList
              tasks={tasks}
              partyById={partyById}
              oppById={oppById}
              userById={userById}
              toggleAction={toggleTask}
              deleteAction={deleteTask}
              hideLinks
            />
          </div>

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
            <Timeline items={activities} userById={userById} />
          </div>
        </div>

        <aside>
          {(party.email || party.phone) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title">Reach out</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {party.email && (
                  <a className="btn btn-primary" href={`mailto:${party.email}`} style={{ flex: 1 }}>
                    ✉️ Email
                  </a>
                )}
                {party.phone && (
                  <a className="btn" href={`tel:${party.phone}`} style={{ flex: 1 }}>
                    📞 Call
                  </a>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {party.email && <div>{party.email}</div>}
                {party.phone && <div>{party.phone}</div>}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Edit details</div>
            <form action={updateParty}>
              <input type="hidden" name="id" value={party.id} />
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-name">Name</label>
                <input id="ed-name" className="input" name="name" defaultValue={party.name} required />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-email">Email</label>
                <input id="ed-email" className="input" type="email" name="email" defaultValue={party.email ?? ''} />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-phone">Phone</label>
                <input id="ed-phone" className="input" name="phone" defaultValue={party.phone ?? ''} />
              </div>
              {party.kind === 'person' && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor="ed-org">Works at</label>
                  <select id="ed-org" name="organizationId" defaultValue={party.organizationId ?? ''}>
                    <option value="">— none —</option>
                    {allParties.filter((p) => p.kind === 'organization').map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save</button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Snapshot</div>
            <dl className="detail-meta">
              <dt>Kind</dt><dd>{party.kind}</dd>
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
                  const owner = o.ownerId ? userById.get(o.ownerId) : undefined;
                  return (
                    <Link key={o.id} href={`/opportunities/${o.id}`} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, display: 'block' }}>
                      <div className="row between">
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{o.title}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatCurrency(o.amount)} · {o.stage}
                          {pipeline && pipeline.id !== db.pipelines.default().id ? ` (${pipeline.name})` : ''}
                        </span>
                      </div>
                      {owner && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Owner: {owner.name}
                        </div>
                      )}
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
