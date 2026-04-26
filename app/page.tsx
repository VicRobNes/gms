import { db, stageKind } from '../lib/store';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const parties = db.parties.list();
  const opportunities = db.opportunities.list();
  const pipelines = db.pipelines.list();
  const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
  const partyById = new Map(parties.map((p) => [p.id, p]));

  // KPIs derived from stage.kind, never from hardcoded names.
  let openValue = 0;
  let wonValue = 0;
  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const opp of opportunities) {
    const pipeline = pipelineById.get(opp.pipelineId);
    if (!pipeline) continue;
    const kind = stageKind(pipeline, opp.stage);
    if (kind === 'open') { openValue += opp.amount; openCount += 1; }
    else if (kind === 'won') { wonValue += opp.amount; wonCount += 1; }
    else if (kind === 'lost') { lostCount += 1; }
  }

  const decided = wonCount + lostCount;
  const conversion = decided > 0 ? wonCount / decided : 0;

  // Pipeline counts grouped by the default pipeline's stages (Stage 3 will
  // make this multi-pipeline).
  const defaultPipeline = db.pipelines.default();
  const stageCounts = defaultPipeline.stages.map((s) => ({
    name: s.name,
    kind: s.kind,
    count: opportunities.filter((o) => o.pipelineId === defaultPipeline.id && o.stage === s.name).length
  }));
  const maxCount = Math.max(1, ...stageCounts.map((s) => s.count));

  // Closing soon: open opportunities, sorted by closeDate ascending.
  const upcoming = opportunities
    .filter((o) => {
      const pipeline = pipelineById.get(o.pipelineId);
      return pipeline && stageKind(pipeline, o.stage) === 'open';
    })
    .sort((a, b) => Date.parse(a.closeDate) - Date.parse(b.closeDate))
    .slice(0, 5);

  const personCount = parties.filter((p) => p.kind === 'person').length;
  const orgCount = parties.filter((p) => p.kind === 'organization').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">{parties.length} parties · {opportunities.length} opportunities</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi">
          <div className="label">Open pipeline</div>
          <div className="value">{formatCurrency(openValue)}</div>
          <div className="helper">{openCount} open opportunities</div>
        </div>
        <div className="card kpi">
          <div className="label">Won revenue</div>
          <div className="value">{formatCurrency(wonValue)}</div>
          <div className="helper">{wonCount} closed-won</div>
        </div>
        <div className="card kpi">
          <div className="label">Conversion</div>
          <div className="value">{(conversion * 100).toFixed(1)}%</div>
          <div className="helper">won / decided ({decided})</div>
        </div>
        <div className="card kpi">
          <div className="label">Parties</div>
          <div className="value">{parties.length}</div>
          <div className="helper">{personCount} people · {orgCount} orgs</div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card">
          <div className="section-title">{defaultPipeline.name} pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageCounts.map((stage) => (
              <div key={stage.name}>
                <div className="row between" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                    {stage.name}{' '}
                    <span className={`badge stage-${stage.kind}`} style={{ marginLeft: 4 }}>{stage.kind}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{stage.count}</span>
                </div>
                <div style={{ background: 'var(--surface-muted)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max(4, (stage.count / maxCount) * 100)}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    borderRadius: 4
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Closing soon</div>
          {upcoming.length === 0 ? (
            <div className="empty">No open opportunities.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((opp) => {
                const party = partyById.get(opp.partyId);
                return (
                  <div key={opp.id} className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{opp.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {party?.name ?? 'Unknown'} · close {new Date(opp.closeDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge" style={{ background: 'var(--surface-muted)' }}>
                      {formatCurrency(opp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
