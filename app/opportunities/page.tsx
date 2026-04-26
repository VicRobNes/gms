import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db, initStore, persistStore, stageKind } from '../../lib/store';
import { getCurrentUser } from '../../lib/auth';
import { StageSelect } from './StageSelect';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  searchParams: { mine?: string };
}

async function createOpportunity(formData: FormData) {
  'use server';
  await initStore();
  const title = String(formData.get('title') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '');
  const pipelineId = String(formData.get('pipelineId') ?? '');
  const stage = String(formData.get('stage') ?? '').trim();
  const amount = Number(formData.get('amount') ?? 0);
  const closeDate = String(formData.get('closeDate') ?? '').trim();
  const ownerId = String(formData.get('ownerId') ?? '') || undefined;
  if (!title || !partyId || !pipelineId || !stage || !closeDate || Number.isNaN(amount)) return;
  db.opportunities.create({ title, partyId, pipelineId, stage, amount, closeDate, ownerId });
  await persistStore();
  revalidatePath('/opportunities');
  revalidatePath('/');
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
  revalidatePath('/opportunities');
  revalidatePath('/');
  if (opp) {
    revalidatePath(`/opportunities/${opp.id}`);
    revalidatePath(`/parties/${opp.partyId}`);
  }
}

async function deleteOpportunity(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  db.opportunities.delete(id);
  await persistStore();
  revalidatePath('/opportunities');
  revalidatePath('/');
}

const dateOffset = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  await initStore();
  const me = getCurrentUser();
  const mine = searchParams.mine === '1';

  const allOpps = db.opportunities.list();
  const opportunities = mine ? allOpps.filter((o) => o.ownerId === me.id) : allOpps;
  const parties = db.parties.list();
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const pipelines = db.pipelines.list();
  const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));
  const defaultPipeline = db.pipelines.default();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Opportunities {mine ? <span style={{ color: 'var(--primary)' }}>· Mine</span> : null}</h1>
          <p className="subtitle">{opportunities.length} {mine ? 'owned by you' : 'in pipeline'}</p>
        </div>
        <Link
          href={mine ? '/opportunities' : '/opportunities?mine=1'}
          className={`btn ${mine ? 'btn-primary' : ''}`}
        >
          {mine ? 'Mine ✓' : 'Mine'}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New opportunity</div>
        {parties.length === 0 ? (
          <div className="empty">Add a party first to create an opportunity.</div>
        ) : (
          <form action={createOpportunity}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="o-title">Title</label>
                <input id="o-title" className="input" name="title" required />
              </div>
              <div className="field">
                <label htmlFor="o-party">Party</label>
                <select id="o-party" name="partyId" required defaultValue={parties[0]?.id}>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.kind === 'organization' ? '(org)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="o-owner">Owner</label>
                <select id="o-owner" name="ownerId" defaultValue={me.id}>
                  <option value="">— unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="o-pipeline">Pipeline</label>
                <select id="o-pipeline" name="pipelineId" defaultValue={defaultPipeline.id}>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="o-stage">Stage</label>
                <select id="o-stage" name="stage" defaultValue={defaultPipeline.stages[0]?.name}>
                  {defaultPipeline.stages.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="o-amount">Amount (USD)</label>
                <input id="o-amount" className="input" type="number" name="amount" min={0} step={100} defaultValue={5000} />
              </div>
              <div className="field">
                <label htmlFor="o-close">Close date</label>
                <input id="o-close" className="input" type="date" name="closeDate" defaultValue={dateOffset(30)} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="submit" className="btn btn-primary">Add opportunity</button>
            </div>
          </form>
        )}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Title</th>
              <th>Party</th>
              <th>Owner</th>
              <th>Pipeline</th>
              <th>Amount</th>
              <th>Close</th>
              <th>Stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => {
              const party = partyById.get(o.partyId);
              const pipeline = pipelineById.get(o.pipelineId);
              const kind = pipeline ? stageKind(pipeline, o.stage) : 'open';
              const owner = o.ownerId ? userById.get(o.ownerId) : undefined;
              return (
                <tr key={o.id}>
                  <td><Link href={`/opportunities/${o.id}`} className="link"><strong>{o.title}</strong></Link></td>
                  <td>{party
                    ? <Link href={`/parties/${party.id}`} className="link">{party.name}</Link>
                    : <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                  <td>{owner?.name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{pipeline?.name ?? '—'}</td>
                  <td>{formatCurrency(o.amount)}</td>
                  <td>{new Date(o.closeDate).toLocaleDateString()}</td>
                  <td>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <span className={`badge stage-${kind}`}>{kind}</span>
                      <form action={updateStage}>
                        <input type="hidden" name="id" value={o.id} />
                        <StageSelect
                          defaultValue={o.stage}
                          stages={pipeline?.stages.map((s) => s.name) ?? []}
                        />
                      </form>
                    </div>
                  </td>
                  <td>
                    <form action={deleteOpportunity}>
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="btn btn-ghost btn-danger">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {opportunities.length === 0 && (
              <tr><td colSpan={8} className="empty">No opportunities yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
