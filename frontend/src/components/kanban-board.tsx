import type { Lead } from '../../../src/types.js';

interface KanbanBoardProps {
  leads: Lead[];
}

export function KanbanBoard({ leads }: KanbanBoardProps) {
  const columns = ['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'] as const;

  return (
    <section>
      <h2>Pipeline</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        {columns.map((stage) => (
          <article key={stage}>
            <h3>{stage}</h3>
            <ul>
              {leads
                .filter((lead) => lead.stage === stage)
                .map((lead) => (
                  <li key={lead.id}>{lead.destinationInterests.join(', ')}</li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
