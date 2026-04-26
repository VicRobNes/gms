import Link from 'next/link';
import { db, initStore, stageKind, type Pipeline, type StageKind } from '../../lib/store';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function ReportsPage() {
  await initStore();

  const opps = db.opportunities.list();
  const tasks = db.tasks.list();
  const activities = db.activities.list();
  const users = db.users.list();
  const pipelines = db.pipelines.list();
  const pipelineById = new Map(pipelines.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  // ----- Owner leaderboard ----------------------------------------------
  type OwnerRow = {
    userId: string;
    name: string;
    openValue: number;
    openCount: number;
    wonValue: number;
    wonCount: number;
    lostCount: number;
    openTasks: number;
    overdueTasks: number;
  };
  const today = new Date().toISOString().slice(0, 10);
  const ownerRows: OwnerRow[] = users.map((u) => ({
    userId: u.id,
    name: u.name,
    openValue: 0,
    openCount: 0,
    wonValue: 0,
    wonCount: 0,
    lostCount: 0,
    openTasks: 0,
    overdueTasks: 0
  }));
  const ownerById = new Map(ownerRows.map((r) => [r.userId, r]));
  for (const o of opps) {
    if (!o.ownerId) continue;
    const row = ownerById.get(o.ownerId);
    if (!row) continue;
    const pipeline = pipelineById.get(o.pipelineId);
    const kind = pipeline ? stageKind(pipeline, o.stage) : 'open';
    if (kind === 'open') { row.openValue += o.amount; row.openCount += 1; }
    else if (kind === 'won') { row.wonValue += o.amount; row.wonCount += 1; }
    else if (kind === 'lost') { row.lostCount += 1; }
  }
  for (const t of tasks) {
    if (!t.assigneeId || t.done) continue;
    const row = ownerById.get(t.assigneeId);
    if (!row) continue;
    row.openTasks += 1;
    if (t.due < today) row.overdueTasks += 1;
  }
  ownerRows.sort((a, b) => b.openValue + b.wonValue - (a.openValue + a.wonValue));
  const maxOwnerValue = Math.max(1, ...ownerRows.map((r) => r.openValue + r.wonValue));

  // ----- Pipeline funnel -----------------------------------------------
  type FunnelStage = { name: string; kind: StageKind; count: number; value: number };
  const funnels: { pipeline: Pipeline; stages: FunnelStage[]; max: number }[] = pipelines.map((p) => {
    const stages: FunnelStage[] = p.stages.map((s) => {
      const stageOpps = opps.filter((o) => o.pipelineId === p.id && o.stage === s.name);
      return {
        name: s.name,
        kind: s.kind,
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + o.amount, 0)
      };
    });
    return { pipeline: p, stages, max: Math.max(1, ...stages.map((s) => s.count)) };
  });

  // ----- Won revenue by month (last 6 months) --------------------------
  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const months: { key: string; label: string; value: number }[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = monthKey(d);
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    monthIndex.set(key, months.length);
    months.push({ key, label, value: 0 });
  }
  for (const o of opps) {
    const pipeline = pipelineById.get(o.pipelineId);
    if (!pipeline) continue;
    if (stageKind(pipeline, o.stage) !== 'won') continue;
    const key = monthKey(new Date(o.closeDate));
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx]!.value += o.amount;
  }
  const maxMonthValue = Math.max(1, ...months.map((m) => m.value));

  // ----- Activity volume (last 30 days) --------------------------------
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const recentActivities = activities.filter((a) => Date.parse(a.at) >= thirtyDaysAgo);
  const activityByUser = new Map<string, { name: string; total: number; byType: Record<string, number> }>();
  for (const u of users) activityByUser.set(u.id, { name: u.name, total: 0, byType: {} });
  for (const a of recentActivities) {
    if (!a.actorId) continue;
    const row = activityByUser.get(a.actorId);
    if (!row) continue;
    row.total += 1;
    row.byType[a.type] = (row.byType[a.type] ?? 0) + 1;
  }
  const activityRows = [...activityByUser.values()].sort((a, b) => b.total - a.total);
  const maxActivity = Math.max(1, ...activityRows.map((r) => r.total));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">Read-only views over everything in the CRM. No filters yet — keep it simple.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Owner leaderboard</div>
        <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Open pipeline</th>
                <th>Won</th>
                <th>Conversion</th>
                <th>Open tasks</th>
                <th>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {ownerRows.map((r) => {
                const decided = r.wonCount + r.lostCount;
                const conv = decided > 0 ? r.wonCount / decided : 0;
                const totalValue = r.openValue + r.wonValue;
                return (
                  <tr key={r.userId}>
                    <td><strong>{r.name}</strong></td>
                    <td>
                      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                        <span style={{ minWidth: 80 }}>{formatCurrency(r.openValue)}</span>
                        <div className="report-bar">
                          <div className="report-bar-fill" style={{ width: `${(totalValue / maxOwnerValue) * 100}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.openCount} open</span>
                    </td>
                    <td>
                      {formatCurrency(r.wonValue)}
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.wonCount} closed-won</div>
                    </td>
                    <td>{decided > 0 ? formatPct(conv) : '—'}</td>
                    <td>{r.openTasks}</td>
                    <td style={{ color: r.overdueTasks > 0 ? 'var(--danger)' : 'inherit' }}>{r.overdueTasks}</td>
                  </tr>
                );
              })}
              {ownerRows.length === 0 && (
                <tr><td colSpan={6} className="empty">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-grid">
        {funnels.map(({ pipeline, stages, max }) => (
          <div className="card" key={pipeline.id}>
            <div className="section-title">{pipeline.name} funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stages.map((s) => (
                <div key={s.name}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {s.name}{' '}
                      <span className={`badge stage-${s.kind}`} style={{ marginLeft: 4 }}>{s.kind}</span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.count} · {formatCurrency(s.value)}
                    </span>
                  </div>
                  <div className="report-bar">
                    <div className="report-bar-fill" style={{ width: `${Math.max(2, (s.count / max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="card">
          <div className="section-title">Won revenue · last 6 months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '8px 0' }}>
            {months.map((m) => (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <div style={{
                  width: '100%',
                  height: `${(m.value / maxMonthValue) * 100}%`,
                  background: m.value > 0 ? 'var(--primary)' : 'var(--surface-muted)',
                  borderRadius: 4,
                  minHeight: 4
                }} title={`${m.label}: ${formatCurrency(m.value)}`} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Closes counted against close-date month for any opportunity in a "won" stage.
          </div>
        </div>

        <div className="card">
          <div className="section-title">Activity volume · last 30 days</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityRows.map((r) => (
              <div key={r.name}>
                <div className="row between" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.total}</span>
                </div>
                <div className="report-bar">
                  <div className="report-bar-fill" style={{ width: `${Math.max(2, (r.total / maxActivity) * 100)}%` }} />
                </div>
                {r.total > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {Object.entries(r.byType).map(([t, n]) => `${t}:${n}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {activityRows.every((r) => r.total === 0) && (
              <div className="empty" style={{ padding: 16 }}>No activity logged in the last 30 days.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        <Link href="/api/parties/export" className="link">Export parties CSV</Link>
      </div>
    </div>
  );
}
