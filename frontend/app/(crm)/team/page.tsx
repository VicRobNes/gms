'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { formatDate, initials, titleCase } from '../../../lib/format';
import type { User, UserRole } from '../../../lib/types';

export default function TeamPage() {
  const { api, bootstrap } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .users()
      .then((data) => !cancelled && setUsers(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load team'));
    return () => {
      cancelled = true;
    };
  }, [api, reload]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtitle">{users.length} members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + Invite member
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="section-grid">
        {users.map((user) => (
          <div key={user.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                letterSpacing: 0.5
              }}
            >
              {initials(user.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Joined {formatDate(user.createdAt)}
              </div>
            </div>
            <span className="badge">{titleCase(user.role)}</span>
          </div>
        ))}
        {users.length === 0 && <div className="empty-state">No team members yet.</div>}
      </div>

      {creating && (
        <InviteMemberModal
          roles={bootstrap?.enums.userRoles ?? ['owner', 'admin', 'agent', 'analyst']}
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

function InviteMemberModal({
  roles,
  onClose,
  onCreated
}: {
  roles: UserRole[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('agent');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createUser({ name, email, role });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not invite member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="Invite team member"
      description="Demo seats can sign in immediately with their email."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Send invite'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
