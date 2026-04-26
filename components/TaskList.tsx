import Link from 'next/link';
import type { Task, Party, Opportunity, User } from '../lib/store';
import { today } from '../lib/store';

interface TaskListProps {
  tasks: Task[];
  partyById?: Map<string, Party>;
  oppById?: Map<string, Opportunity>;
  userById?: Map<string, User>;
  toggleAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  /** Hide the party/opp columns when shown inside a detail page where context is implied. */
  hideLinks?: boolean;
  /** Hide the assignee column (e.g. when a "mine" filter already implies it). */
  hideAssignee?: boolean;
}

const dueLabel = (due: string, done: boolean): { text: string; tone: 'overdue' | 'today' | 'soon' | 'done' } => {
  if (done) return { text: due, tone: 'done' };
  const now = today();
  if (due < now) return { text: due, tone: 'overdue' };
  if (due === now) return { text: 'Today', tone: 'today' };
  return { text: due, tone: 'soon' };
};

export function TaskList({ tasks, partyById, oppById, userById, toggleAction, deleteAction, hideLinks, hideAssignee }: TaskListProps) {
  if (tasks.length === 0) {
    return <div className="empty">No tasks.</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th>Title</th>
            <th style={{ width: 120 }}>Due</th>
            {!hideAssignee && <th style={{ width: 140 }}>Assignee</th>}
            {!hideLinks && <th>Party</th>}
            {!hideLinks && <th>Opportunity</th>}
            <th style={{ width: 72 }} />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const due = dueLabel(t.due, t.done);
            const party = t.partyId ? partyById?.get(t.partyId) : undefined;
            const opp = t.opportunityId ? oppById?.get(t.opportunityId) : undefined;
            const assignee = t.assigneeId ? userById?.get(t.assigneeId) : undefined;
            return (
              <tr key={t.id} style={t.done ? { opacity: 0.55 } : undefined}>
                <td>
                  <form action={toggleAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      aria-label={t.done ? 'Reopen task' : 'Mark complete'}
                      title={t.done ? 'Reopen task' : 'Mark complete'}
                      style={{
                        width: 18, height: 18, borderRadius: 4, border: '1.5px solid var(--border)',
                        background: t.done ? 'var(--success)' : 'var(--surface)', cursor: 'pointer', padding: 0,
                        color: '#fff', fontSize: 12, lineHeight: 1
                      }}
                    >
                      {t.done ? '✓' : ''}
                    </button>
                  </form>
                </td>
                <td>
                  <span style={{ fontWeight: 600, textDecoration: t.done ? 'line-through' : undefined }}>{t.title}</span>
                </td>
                <td>
                  <span className={`badge task-due-${due.tone}`}>{due.text}</span>
                </td>
                {!hideAssignee && (
                  <td>
                    {assignee
                      ? <span style={{ fontSize: 12.5 }}>{assignee.name}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                )}
                {!hideLinks && <td>{party ? <Link href={`/parties/${party.id}`} className="link">{party.name}</Link> : '—'}</td>}
                {!hideLinks && <td>{opp ? <Link href={`/opportunities/${opp.id}`} className="link">{opp.title}</Link> : '—'}</td>}
                <td>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="btn btn-ghost btn-danger" style={{ padding: '4px 8px' }}>Delete</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
