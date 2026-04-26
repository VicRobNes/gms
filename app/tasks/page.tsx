import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { TaskList } from '../../components/TaskList';
import { db, today } from '../../lib/store';
import { getCurrentUser } from '../../lib/auth';

export const dynamic = 'force-dynamic';

type View = 'open' | 'today' | 'overdue' | 'upcoming' | 'done';

const VIEWS: { id: View; label: string }[] = [
  { id: 'open',     label: 'Open' },
  { id: 'today',    label: 'Today' },
  { id: 'overdue',  label: 'Overdue' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'done',     label: 'Done' }
];

interface PageProps {
  searchParams: { view?: string; mine?: string };
}

const dateOffset = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function createTask(formData: FormData) {
  'use server';
  const title = String(formData.get('title') ?? '').trim();
  const due = String(formData.get('due') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '') || undefined;
  const opportunityId = String(formData.get('opportunityId') ?? '') || undefined;
  const assigneeId = String(formData.get('assigneeId') ?? '') || undefined;
  if (!title || !due) return;
  db.tasks.create({ title, due, partyId, opportunityId, assigneeId });
  revalidatePath('/tasks');
  revalidatePath('/');
  if (partyId) revalidatePath(`/parties/${partyId}`);
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

async function toggleTask(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const me = getCurrentUser();
  const t = db.tasks.toggleDone(id, me.id);
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

export default function TasksPage({ searchParams }: PageProps) {
  const view: View = (VIEWS.some((v) => v.id === searchParams.view) ? searchParams.view : 'open') as View;
  const mine = searchParams.mine === '1';
  const me = getCurrentUser();
  const t = today();

  const filterByView = (open: boolean) =>
    view === 'open'     ? db.tasks.list({ open: true }) :
    view === 'today'    ? db.tasks.list({ open: true, dueOn: t }) :
    view === 'overdue'  ? db.tasks.list({ open: true, dueBefore: t }) :
    view === 'upcoming' ? db.tasks.list({ open: true }).filter((x) => x.due > t) :
                          db.tasks.list({ open: false });

  let items = filterByView(view !== 'done');
  if (mine) items = items.filter((x) => x.assigneeId === me.id);

  // Counts for chip badges (respect the "mine" toggle)
  const allTasks = db.tasks.list();
  const scope = mine ? allTasks.filter((x) => x.assigneeId === me.id) : allTasks;
  const openScope = scope.filter((x) => !x.done);
  const counts = {
    open: openScope.length,
    today: openScope.filter((x) => x.due === t).length,
    overdue: openScope.filter((x) => x.due < t).length,
    upcoming: openScope.filter((x) => x.due > t).length,
    done: scope.filter((x) => x.done).length
  } as const;

  const parties = db.parties.list();
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const opps = db.opportunities.list();
  const oppById = new Map(opps.map((o) => [o.id, o]));
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks {mine ? <span style={{ color: 'var(--primary)' }}>· Mine</span> : null}</h1>
          <p className="subtitle">{counts.open} open · {counts.overdue} overdue · {counts.today} today</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={`/tasks?view=${v.id}${mine ? '&mine=1' : ''}`}
            className={`btn ${view === v.id ? 'btn-primary' : ''}`}
          >
            {v.label} <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[v.id]})</span>
          </Link>
        ))}
        <span style={{ flex: 1 }} />
        <Link
          href={`/tasks?view=${view}${mine ? '' : '&mine=1'}`}
          className={`btn ${mine ? 'btn-primary' : ''}`}
          title={mine ? 'Show all' : `Show only ${me.name}'s tasks`}
        >
          {mine ? 'Mine ✓' : 'Mine'}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New task</div>
        <form action={createTask}>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="t-title">Title</label>
              <input id="t-title" className="input" name="title" required placeholder="What needs to happen?" />
            </div>
            <div className="field">
              <label htmlFor="t-due">Due</label>
              <input id="t-due" className="input" type="date" name="due" defaultValue={dateOffset(1)} required />
            </div>
            <div className="field">
              <label htmlFor="t-assignee">Assignee</label>
              <select id="t-assignee" name="assigneeId" defaultValue={me.id}>
                <option value="">— unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-party">Party</label>
              <select id="t-party" name="partyId" defaultValue="">
                <option value="">— none —</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-opp">Opportunity</label>
              <select id="t-opp" name="opportunityId" defaultValue="">
                <option value="">— none —</option>
                {opps.map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary">Add task</button>
          </div>
        </form>
      </div>

      <TaskList
        tasks={items}
        partyById={partyById}
        oppById={oppById}
        userById={userById}
        toggleAction={toggleTask}
        deleteAction={deleteTask}
      />
    </div>
  );
}
