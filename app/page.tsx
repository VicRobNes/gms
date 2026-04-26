import { store, STAGES } from '../lib/store';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const contacts = store.contacts.list();
  const deals = store.deals.list();

  const wonValue = deals.filter((d) => d.stage === 'won').reduce((sum, d) => sum + d.amount, 0);
  const openValue = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((sum, d) => sum + d.amount, 0);
  const wonCount = deals.filter((d) => d.stage === 'won').length;
  const conversion = deals.length > 0 ? wonCount / deals.length : 0;

  const counts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = deals.filter((d) => d.stage === s).length;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(counts));

  const upcoming = deals
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    .sort((a, b) => Date.parse(a.closeDate) - Date.parse(b.closeDate))
    .slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">{contacts.length} contacts · {deals.length} deals</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi">
          <div className="label">Open pipeline</div>
          <div className="value">{formatCurrency(openValue)}</div>
          <div className="helper">{deals.length - wonCount - counts['lost']} active deals</div>
        </div>
        <div className="card kpi">
          <div className="label">Won revenue</div>
          <div className="value">{formatCurrency(wonValue)}</div>
          <div className="helper">{wonCount} closed deals</div>
        </div>
        <div className="card kpi">
          <div className="label">Conversion</div>
          <div className="value">{(conversion * 100).toFixed(1)}%</div>
          <div className="helper">won / total</div>
        </div>
        <div className="card kpi">
          <div className="label">Contacts</div>
          <div className="value">{contacts.length}</div>
          <div className="helper">in your CRM</div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card">
          <div className="section-title">Pipeline by stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STAGES.map((stage) => {
              const count = counts[stage] ?? 0;
              return (
                <div key={stage}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 12.5 }}>{stage}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(4, (count / maxCount) * 100)}%`,
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 4
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Closing soon</div>
          {upcoming.length === 0 ? (
            <div className="empty">No open deals.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((deal) => {
                const contact = contacts.find((c) => c.id === deal.contactId);
                return (
                  <div key={deal.id} className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{deal.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {contact?.name ?? 'Unknown'} · close {new Date(deal.closeDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge" style={{ background: 'var(--surface-muted)' }}>
                      {formatCurrency(deal.amount)}
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
