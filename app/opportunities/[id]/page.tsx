import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Timeline } from '../../../components/Timeline';
import { TaskList } from '../../../components/TaskList';
import { db, initStore, persistStore, stageKind, type ActivityType } from '../../../lib/store';
import { getCurrentUser } from '../../../lib/auth';
import { StageSelect } from '../StageSelect';
import { OwnerSelect } from '../OwnerSelect';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  params: { id: string };
}

async function addActivity(formData: FormData) {
  'use server';
  await initStore();
  const opportunityId = String(formData.get('opportunityId') ?? '');
  const partyId = String(formData.get('partyId') ?? '') || undefined;
  const type = (String(formData.get('type') ?? 'note') as ActivityType);
  const body = String(formData.get('body') ?? '').trim();
  if (!opportunityId || !body) return;
  const me = getCurrentUser();
  db.activities.create({
    type,
    opportunityId,
    partyId,
    actorId: me.id,
    body,
    at: new Date().toISOString()
  });
  await persistStore();
  revalidatePath(`/opportunities/${opportunityId}`);
  if (partyId) revalidatePath(`/parties/${partyId}`);
}

async function addTask(formData: FormData) {
  'use server';
  await initStore();
  const opportunityId = String(formData.get('opportunityId') ?? '');
  const partyId = String(formData.get('partyId') ?? '') || undefined;
  const title = String(formData.get('title') ?? '').trim();
  const due = String(formData.get('due') ?? '').trim();
  const assigneeId = String(formData.get('assigneeId') ?? '') || undefined;
  if (!opportunityId || !title || !due) return;
  db.tasks.create({ title, due, partyId, opportunityId, assigneeId });
  await persistStore();
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath('/tasks');
  revalidatePath('/');
  if (partyId) revalidatePath(`/parties/${partyId}`);
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

async function updateStage(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  const stage = String(formData.get('stage') ?? '');
  if (!id || !stage) return;
  const me = getCurrentUser();
  const opp = db.opportunities.setStage(id, stage, me.id);
  await persistStore();
  revalidatePath(`/opportunities/${id}`);
  revalidatePath('/opportunities');
  revalidatePath('/');
  if (opp) revalidatePath(`/parties/${opp.partyId}`);
}

async function updateDetails(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const title = String(formData.get('title') ?? '').trim();
  const amount = Number(formData.get('amount') ?? 0);
  const closeDate = String(formData.get('closeDate') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '').trim();
  if (!title || Number.isNaN(amount) || !closeDate || !partyId) return;
  const opp = db.opportunities.update(id, { title, amount, closeDate, partyId });
  await persistStore();
  revalidatePath(`/opportunities/${id}`);
  revalidatePath('/opportunities');
  revalidatePath('/');
  if (opp) revalidatePath(`/parties/${opp.partyId}`);
}

async function updateOwner(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  const ownerId = String(formData.get('ownerId') ?? '') || undefined;
  if (!id) return;
  const me = getCurrentUser();
  const opp = db.opportunities.setOwner(id, ownerId, me.id);
  await persistStore();
  revalidatePath(`/opportunities/${id}`);
  revalidatePath('/opportunities');
  revalidatePath('/');
  if (opp) revalidatePath(`/parties/${opp.partyId}`);
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  await initStore();
  const opp = db.opportunities.get(params.id);
  if (!opp) notFound();

  const me = getCurrentUser();
  const party = db.parties.get(opp.partyId);
  const allParties = db.parties.list();
  const pipeline = db.pipelines.get(opp.pipelineId);
  const kind = pipeline ? stageKind(pipeline, opp.stage) : 'open';
  const activities = db.activities.list({ opportunityId: opp.id });
  const tasks = db.tasks.list({ opportunityId: opp.id });
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));
  const owner = opp.ownerId ? userById.get(opp.ownerId) : undefined;
  const dateOffset = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{opp.title}</h1>
          <p className="subtitle">
            {party ? <Link href={`/parties/${party.id}`} className="link">{party.name}</Link> : 'Unknown party'} · {pipeline?.name ?? 'no pipeline'}
          </p>
        </div>
        <Link href="/opportunities" className="btn btn-ghost">← Opportunities</Link>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Tasks</div>
            <form action={addTask} style={{ marginBottom: 16 }}>
              <input type="hidden" name="opportunityId" value={opp.id} />
              {party && <input type="hidden" name="partyId" value={party.id} />}
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
                  <label htmlFor="task-assignee">Assignee</label>
                  <select id="task-assignee" name="assigneeId" defaultValue={opp.ownerId ?? me.id}>
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
              userById={userById}
              toggleAction={toggleTask}
              deleteAction={deleteTask}
              hideLinks
            />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Activity</div>
            <form action={addActivity} style={{ marginBottom: 16 }}>
              <input type="hidden" name="opportunityId" value={opp.id} />
              {party && <input type="hidden" name="partyId" value={party.id} />}
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
          {party && (party.email || party.phone) && (
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
            <form action={updateDetails}>
              <input type="hidden" name="id" value={opp.id} />
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-title">Title</label>
                <input id="ed-title" className="input" name="title" defaultValue={opp.title} required />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-amount">Amount (USD)</label>
                <input id="ed-amount" className="input" type="number" min={0} step={100} name="amount" defaultValue={opp.amount} />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="ed-close">Close date</label>
                <input id="ed-close" className="input" type="date" name="closeDate" defaultValue={opp.closeDate} required />
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="ed-party">Party</label>
                <select id="ed-party" name="partyId" defaultValue={opp.partyId}>
                  {allParties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save</button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Snapshot</div>
            <dl className="detail-meta">
              <dt>Owner</dt><dd>{owner?.name ?? '—'}</dd>
              <dt>Pipeline</dt><dd>{pipeline?.name ?? '—'}</dd>
              <dt>Stage</dt>
              <dd>
                <span className={`badge stage-${kind}`} style={{ marginRight: 6 }}>{kind}</span>
                {opp.stage}
              </dd>
              <dt>Amount</dt><dd>{formatCurrency(opp.amount)}</dd>
              <dt>Close</dt><dd>{new Date(opp.closeDate).toLocaleDateString()}</dd>
              <dt>Added</dt><dd>{new Date(opp.createdAt).toLocaleDateString()}</dd>
            </dl>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Move stage</div>
            <form action={updateStage}>
              <input type="hidden" name="id" value={opp.id} />
              <StageSelect
                defaultValue={opp.stage}
                stages={pipeline?.stages.map((s) => s.name) ?? []}
              />
            </form>
          </div>

          <div className="card">
            <div className="section-title">Reassign owner</div>
            <form action={updateOwner}>
              <input type="hidden" name="id" value={opp.id} />
              <OwnerSelect users={users} defaultValue={opp.ownerId} />
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
