import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Timeline } from '../../../components/Timeline';
import { TaskList } from '../../../components/TaskList';
import { db, stageKind, type ActivityType } from '../../../lib/store';
import { StageSelect } from '../StageSelect';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  params: { id: string };
}

async function addActivity(formData: FormData) {
  'use server';
  const opportunityId = String(formData.get('opportunityId') ?? '');
  const partyId = String(formData.get('partyId') ?? '') || undefined;
  const type = (String(formData.get('type') ?? 'note') as ActivityType);
  const body = String(formData.get('body') ?? '').trim();
  if (!opportunityId || !body) return;
  db.activities.create({
    type,
    opportunityId,
    partyId,
    body,
    at: new Date().toISOString()
  });
  revalidatePath(`/opportunities/${opportunityId}`);
  if (partyId) revalidatePath(`/parties/${partyId}`);
}

async function addTask(formData: FormData) {
  'use server';
  const opportunityId = String(formData.get('opportunityId') ?? '');
  const partyId = String(formData.get('partyId') ?? '') || undefined;
  const title = String(formData.get('title') ?? '').trim();
  const due = String(formData.get('due') ?? '').trim();
  if (!opportunityId || !title || !due) return;
  db.tasks.create({ title, due, partyId, opportunityId });
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath('/tasks');
  revalidatePath('/');
  if (partyId) revalidatePath(`/parties/${partyId}`);
}

async function toggleTask(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const t = db.tasks.toggleDone(id);
  revalidatePath('/tasks');
  revalidatePath('/');
  if (t?.partyId) revalidatePath(`/parties/${t.partyId}`);
  if (t?.opportunityId) revalidatePath(`/opportunities/${t.opportunityId}`);
}

async function deleteTask(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const t = db.tasks.get(id);
  db.tasks.delete(id);
  revalidatePath('/tasks');
  revalidatePath('/');
  if (t?.partyId) revalidatePath(`/parties/${t.partyId}`);
  if (t?.opportunityId) revalidatePath(`/opportunities/${t.opportunityId}`);
}

async function updateStage(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const stage = String(formData.get('stage') ?? '');
  if (!id || !stage) return;
  const opp = db.opportunities.setStage(id, stage);
  revalidatePath(`/opportunities/${id}`);
  revalidatePath('/opportunities');
  revalidatePath('/');
  if (opp) revalidatePath(`/parties/${opp.partyId}`);
}

export default function OpportunityDetailPage({ params }: PageProps) {
  const opp = db.opportunities.get(params.id);
  if (!opp) notFound();

  const party = db.parties.get(opp.partyId);
  const pipeline = db.pipelines.get(opp.pipelineId);
  const kind = pipeline ? stageKind(pipeline, opp.stage) : 'open';
  const activities = db.activities.list({ opportunityId: opp.id });
  const tasks = db.tasks.list({ opportunityId: opp.id });
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
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn btn-primary">Add task</button>
              </div>
            </form>
            <TaskList
              tasks={tasks}
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
            <Timeline items={activities} />
          </div>
        </div>

        <aside>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Details</div>
            <dl className="detail-meta">
              <dt>Party</dt>
              <dd>{party ? <Link href={`/parties/${party.id}`} className="link">{party.name}</Link> : '—'}</dd>
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

          <div className="card">
            <div className="section-title">Move stage</div>
            <form action={updateStage}>
              <input type="hidden" name="id" value={opp.id} />
              <StageSelect
                defaultValue={opp.stage}
                stages={pipeline?.stages.map((s) => s.name) ?? []}
              />
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
