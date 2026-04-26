'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { formatCents, formatPercent, titleCase } from '../../../lib/format';
import type { DashboardSnapshot, Task } from '../../../lib/types';

export default function DashboardPage() {
  const { api, session } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([api.dashboard(), api.tasks()])
      .then(([dash, tk]) => {
        if (cancelled) return;
        setSnapshot(dash);
        setTasks(tk);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'));
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (error) return <div className="alert alert-error">{error}</div>;

  if (!snapshot) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, 6);

  const stageOrder = ['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];
  const maxStage = Math.max(1, ...stageOrder.map((s) => snapshot.pipeline.leadsByStage[s] ?? 0));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {session?.user.name.split(' ')[0]}</h1>
          <p className="subtitle">Snapshot for {session?.organization.name}</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="card kpi">
          <div className="label">Pipeline value</div>
          <div className="value">{formatCents(snapshot.pipeline.pipelineValueCents)}</div>
          <div className="helper">{snapshot.pipeline.totalLeads} active leads</div>
        </div>
        <div className="card kpi">
          <div className="label">Booked revenue</div>
          <div className="value">{formatCents(snapshot.operations.bookedRevenueCents)}</div>
          <div className="helper">+ {formatCents(snapshot.operations.quotedRevenueCents)} quoted</div>
        </div>
        <div className="card kpi">
          <div className="label">Conversion rate</div>
          <div className="value">{formatPercent(snapshot.pipeline.conversionRate, 1)}</div>
          <div className="helper">{snapshot.pipeline.wonLeads} won leads</div>
        </div>
        <div className="card kpi">
          <div className="label">Open tasks</div>
          <div className="value">{snapshot.operations.openTasks}</div>
          <div className="helper">{snapshot.operations.overdueTasks} overdue</div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card">
          <div className="section-title">Pipeline by stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageOrder.map((stage) => {
              const count = snapshot.pipeline.leadsByStage[stage] ?? 0;
              const ratio = count / maxStage;
              return (
                <div key={stage}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{titleCase(stage)}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(4, ratio * 100)}%`,
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 4,
                        transition: 'width 200ms ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Marketing performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="kpi">
              <div className="label">Active campaigns</div>
              <div className="value" style={{ fontSize: 20 }}>{snapshot.marketing.activeCampaigns}</div>
            </div>
            <div className="kpi">
              <div className="label">Spend</div>
              <div className="value" style={{ fontSize: 20 }}>{formatCents(snapshot.marketing.spendCents)}</div>
            </div>
            <div className="kpi">
              <div className="label">CTR</div>
              <div className="value" style={{ fontSize: 20 }}>{formatPercent(snapshot.marketing.ctr, 2)}</div>
            </div>
            <div className="kpi">
              <div className="label">Cost / lead</div>
              <div className="value" style={{ fontSize: 20 }}>
                {snapshot.marketing.costPerLeadCents > 0 ? formatCents(snapshot.marketing.costPerLeadCents) : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Attributed leads</div>
              <div className="value" style={{ fontSize: 20 }}>{snapshot.marketing.attributedLeads}</div>
            </div>
            <div className="kpi">
              <div className="label">Attributed bookings</div>
              <div className="value" style={{ fontSize: 20 }}>{snapshot.marketing.attributedBookings}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Upcoming tasks</div>
          {upcomingTasks.length === 0 ? (
            <div className="empty-state">All clear — no open tasks.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTasks.map((task) => {
                const overdue = Date.parse(task.dueAt) < Date.now();
                return (
                  <div key={task.id} className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                        Due {new Date(task.dueAt).toLocaleDateString()} · {titleCase(task.type)}
                      </div>
                    </div>
                    <span className={`badge priority-${task.priority}`}>{task.priority}</span>
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
