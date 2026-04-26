'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import { formatDateTime, titleCase } from '../../../lib/format';
import type { Lead, Task, TaskPriority, TaskStatus, TaskType, User } from '../../../lib/types';

const STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];

export default function TasksPage() {
  const { api, bootstrap } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      api.tasks({ status: statusFilter || undefined, ownerId: ownerFilter || undefined }),
      api.users(),
      api.leads({ pageSize: 100 })
    ])
      .then(([t, u, l]) => {
        if (cancelled) return;
        setTasks(t);
        setUsers(u);
        setLeads(l.items);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load tasks'));
    return () => {
      cancelled = true;
    };
  }, [api, statusFilter, ownerFilter, reload]);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const advance = async (task: Task, status: TaskStatus) => {
    const previous = tasks;
    setTasks((curr) => curr.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api.setTaskStatus(task.id, status);
    } catch (err) {
      setTasks(previous);
      setError(err instanceof ApiError ? err.message : 'Could not update task');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete task');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="subtitle">{tasks.length} tasks</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New task
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
          style={{ maxWidth: 180 }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Task</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const owner = task.ownerId ? userById.get(task.ownerId) : undefined;
              const overdue = task.status !== 'done' && Date.parse(task.dueAt) < Date.now();
              return (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                  </td>
                  <td><span className="badge">{titleCase(task.type)}</span></td>
                  <td>{owner?.name ?? '—'}</td>
                  <td style={{ color: overdue ? 'var(--danger)' : undefined }}>{formatDateTime(task.dueAt)}</td>
                  <td><span className={`badge priority-${task.priority}`}>{titleCase(task.priority)}</span></td>
                  <td>
                    <select value={task.status} onChange={(e) => advance(task, e.target.value as TaskStatus)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-danger" onClick={() => remove(task.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateTaskModal
          users={users}
          leads={leads}
          types={bootstrap?.enums.taskTypes ?? ['follow_up', 'proposal', 'itinerary', 'payment']}
          priorities={bootstrap?.enums.taskPriorities ?? ['low', 'medium', 'high']}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
  users,
  leads,
  types,
  priorities,
  onClose,
  onCreated
}: {
  users: User[];
  leads: Lead[];
  types: TaskType[];
  priorities: TaskPriority[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api, session } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>(types[0] ?? 'follow_up');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [ownerId, setOwnerId] = useState<string>(session?.user.id ?? '');
  const [leadId, setLeadId] = useState<string>('');
  const [dueLocal, setDueLocal] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createTask({
        title,
        type,
        priority,
        ownerId: ownerId || undefined,
        leadId: leadId || undefined,
        dueAt: new Date(dueLocal).toISOString()
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Create'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} required />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Lead</label>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">No lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.destinationInterests.join(', ') || l.id.slice(0, 6)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Due</label>
          <input className="input" type="datetime-local" value={dueLocal} onChange={(e) => setDueLocal(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
}
