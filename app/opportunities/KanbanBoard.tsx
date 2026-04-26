'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Opportunity, Party, Pipeline, User } from '../../lib/store';

interface KanbanBoardProps {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  partyById: Map<string, Party>;
  userById: Map<string, User>;
  /** Server Action that performs the stage move. Receives FormData with id + stage. */
  moveAction: (formData: FormData) => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function KanbanBoard({ pipeline, opportunities, partyById, userById, moveAction }: KanbanBoardProps) {
  // Optimistic state — moves feel instant, then revalidate kicks in.
  const [optimistic, setOptimistic] = useState(opportunities);
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState<string | null>(null);

  // Keep optimistic state in sync if server data changes.
  if (
    optimistic.length !== opportunities.length ||
    optimistic.some((o, i) => o.id !== opportunities[i]?.id || o.stage !== opportunities[i]?.stage)
  ) {
    setOptimistic(opportunities);
  }

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const opp = optimistic.find((o) => o.id === id);
    if (!opp || opp.stage === stageName) return;
    setOptimistic((curr) => curr.map((o) => (o.id === id ? { ...o, stage: stageName } : o)));
    const fd = new FormData();
    fd.set('id', id);
    fd.set('stage', stageName);
    startTransition(() => moveAction(fd));
  };

  return (
    <div className="kanban">
      {pipeline.stages.map((stage) => {
        const inStage = optimistic.filter((o) => o.stage === stage.name);
        const total = inStage.reduce((sum, o) => sum + o.amount, 0);
        return (
          <div
            key={stage.name}
            className={`kanban-column ${hover === stage.name ? 'kanban-column-hover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setHover(stage.name); }}
            onDragLeave={() => setHover((h) => (h === stage.name ? null : h))}
            onDrop={(e) => onDrop(e, stage.name)}
          >
            <div className="kanban-column-header">
              <span style={{ fontWeight: 600, fontSize: 13 }}>{stage.name}</span>
              <span className={`badge stage-${stage.kind}`} style={{ marginLeft: 6 }}>{stage.kind}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                {inStage.length} · {formatCurrency(total)}
              </span>
            </div>
            <div className="kanban-cards">
              {inStage.map((o) => {
                const party = partyById.get(o.partyId);
                const owner = o.ownerId ? userById.get(o.ownerId) : undefined;
                return (
                  <div
                    key={o.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => onDragStart(e, o.id)}
                  >
                    <Link href={`/opportunities/${o.id}`} className="kanban-card-title">{o.title}</Link>
                    <div className="kanban-card-meta">
                      {party?.name ?? 'Unknown'} · {formatCurrency(o.amount)}
                    </div>
                    {owner && (
                      <div className="kanban-card-owner">{owner.name}</div>
                    )}
                  </div>
                );
              })}
              {inStage.length === 0 && (
                <div className="kanban-empty">Drop here</div>
              )}
            </div>
          </div>
        );
      })}
      {pending && <div className="kanban-pending" />}
    </div>
  );
}
