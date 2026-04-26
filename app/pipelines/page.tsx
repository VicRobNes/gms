import { revalidatePath } from 'next/cache';
import { db, initStore, persistStore, type PipelineStage, type StageKind } from '../../lib/store';
import { StagesEditor } from './StagesEditor';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { error?: string };
}

const TEMPLATES: Record<string, { name: string; stages: PipelineStage[] }> = {
  sales: {
    name: 'Sales',
    stages: [
      { name: 'New', kind: 'open' },
      { name: 'Qualified', kind: 'open' },
      { name: 'Proposal', kind: 'open' },
      { name: 'Won', kind: 'won' },
      { name: 'Lost', kind: 'lost' }
    ]
  },
  marketing: {
    name: 'Campaign delivery',
    stages: [
      { name: 'Brief', kind: 'open' },
      { name: 'Strategy', kind: 'open' },
      { name: 'Production', kind: 'open' },
      { name: 'Live', kind: 'open' },
      { name: 'Delivered', kind: 'won' },
      { name: 'Cancelled', kind: 'lost' }
    ]
  },
  onboarding: {
    name: 'Onboarding',
    stages: [
      { name: 'Kickoff', kind: 'open' },
      { name: 'Setup', kind: 'open' },
      { name: 'Training', kind: 'open' },
      { name: 'Live', kind: 'won' },
      { name: 'Stalled', kind: 'lost' }
    ]
  }
};

async function createPipeline(formData: FormData) {
  'use server';
  await initStore();
  const template = String(formData.get('template') ?? 'sales');
  const customName = String(formData.get('name') ?? '').trim();
  const tpl = TEMPLATES[template];
  if (!tpl) return;
  db.pipelines.create({ name: customName || tpl.name, stages: tpl.stages });
  await persistStore();
  revalidatePath('/pipelines');
  revalidatePath('/');
  revalidatePath('/opportunities');
}

async function updatePipeline(formData: FormData): Promise<void> {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const stagesRaw = String(formData.get('stages') ?? '');
  if (!id || !stagesRaw) return;

  let stages: PipelineStage[] = [];
  try {
    const parsed = JSON.parse(stagesRaw) as Array<{ name: string; kind: StageKind }>;
    stages = parsed
      .map((s) => ({ name: String(s.name ?? '').trim(), kind: s.kind }))
      .filter((s) => s.name && (s.kind === 'open' || s.kind === 'won' || s.kind === 'lost'));
  } catch {
    return;
  }

  if (stages.length === 0) {
    revalidatePath(`/pipelines?error=${encodeURIComponent('A pipeline needs at least one stage.')}`);
    return;
  }
  // Stage names must be unique within a pipeline.
  const seen = new Set<string>();
  for (const s of stages) {
    if (seen.has(s.name)) {
      revalidatePath(`/pipelines?error=${encodeURIComponent(`Duplicate stage "${s.name}".`)}`);
      return;
    }
    seen.add(s.name);
  }

  const result = db.pipelines.update(id, { name, stages });
  if (!result.ok) {
    revalidatePath(`/pipelines?error=${encodeURIComponent(result.reason)}`);
    return;
  }
  await persistStore();
  revalidatePath('/pipelines');
  revalidatePath('/opportunities');
  revalidatePath('/');
}

async function deletePipeline(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const result = db.pipelines.delete(id);
  if (!result.ok) {
    revalidatePath(`/pipelines?error=${encodeURIComponent(result.reason)}`);
    return;
  }
  await persistStore();
  revalidatePath('/pipelines');
  revalidatePath('/opportunities');
  revalidatePath('/');
}

export default async function PipelinesPage({ searchParams }: PageProps) {
  await initStore();
  const pipelines = db.pipelines.list();
  const opps = db.opportunities.list();
  const oppCountByPipeline = new Map<string, number>();
  for (const o of opps) oppCountByPipeline.set(o.pipelineId, (oppCountByPipeline.get(o.pipelineId) ?? 0) + 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pipelines</h1>
          <p className="subtitle">{pipelines.length} pipelines · {opps.length} opportunities total</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="alert alert-error">{searchParams.error}</div>
      )}

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New pipeline from template</div>
        <form action={createPipeline}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="tpl">Template</label>
              <select id="tpl" name="template" defaultValue="marketing">
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <option key={key} value={key}>{t.name} ({t.stages.length} stages)</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="name">Custom name (optional)</label>
              <input id="name" className="input" name="name" placeholder="Leave blank to use template name" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary">Create pipeline</button>
          </div>
        </form>
      </div>

      <div className="section-grid">
        {pipelines.map((p) => {
          const inUse = oppCountByPipeline.get(p.id) ?? 0;
          return (
            <div key={p.id} className="card">
              <div className="row between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.stages.length} stages · {inUse} opportunit{inUse === 1 ? 'y' : 'ies'}
                  </div>
                </div>
                <form action={deletePipeline}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="btn btn-ghost btn-danger"
                    disabled={inUse > 0 || pipelines.length <= 1}
                    title={
                      pipelines.length <= 1
                        ? "Can't delete the last pipeline"
                        : inUse > 0
                        ? 'Move opportunities first'
                        : 'Delete pipeline'
                    }
                  >
                    Delete
                  </button>
                </form>
              </div>
              <form action={updatePipeline}>
                <input type="hidden" name="id" value={p.id} />
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor={`name-${p.id}`}>Name</label>
                  <input id={`name-${p.id}`} className="input" name="name" defaultValue={p.name} required />
                </div>
                <StagesEditor initialStages={p.stages} />
                <div style={{ marginTop: 14 }}>
                  <button type="submit" className="btn btn-primary">Save changes</button>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
