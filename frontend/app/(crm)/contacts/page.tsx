'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { formatDate, titleCase } from '../../../lib/format';
import type { Contact, ContactSource } from '../../../lib/types';

const PAGE_SIZE = 15;

export default function ContactsPage() {
  const { api, bootstrap } = useAuth();
  const [items, setItems] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .contacts({ page, pageSize: PAGE_SIZE, search: search || undefined })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load contacts'));
    return () => {
      cancelled = true;
    };
  }, [api, page, search, reload]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onDelete = async (contact: Contact) => {
    if (!confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) return;
    try {
      await api.deleteContact(contact.id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete contact');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p className="subtitle">{total} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New contact
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Source</th>
              <th>Country</th>
              <th>Tags</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <strong>
                    {contact.firstName} {contact.lastName}
                  </strong>
                  {contact.phone && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{contact.phone}</div>}
                </td>
                <td>{contact.email}</td>
                <td><span className="badge">{titleCase(contact.source)}</span></td>
                <td>{contact.country}</td>
                <td>
                  {contact.tags.length === 0 ? '—' : contact.tags.map((t) => <span key={t} className="badge" style={{ marginRight: 4 }}>{t}</span>)}
                </td>
                <td>{formatDate(contact.createdAt)}</td>
                <td>
                  <button className="btn btn-ghost btn-danger" onClick={() => onDelete(contact)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                  No contacts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row between" style={{ marginTop: 14 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
          Page {page} of {totalPages}
        </span>
        <div className="row">
          <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {creating && (
        <CreateContactModal
          sources={bootstrap?.enums.contactSources ?? ['website', 'instagram', 'facebook', 'partner', 'referral', 'walk_in']}
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

function CreateContactModal({
  sources,
  onClose,
  onCreated
}: {
  sources: ContactSource[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [source, setSource] = useState<ContactSource>(sources[0] ?? 'website');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createContact({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        country,
        source,
        notes: notes || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create contact');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="New contact"
      description="Add a new traveler or partner contact to your CRM."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting} type="button">
            {submitting ? 'Saving…' : 'Create contact'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-grid">
          <div className="field">
            <label>First name</label>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Last name</label>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Country (ISO-2)</label>
            <input
              className="input"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              minLength={2}
              required
            />
          </div>
          <div className="field">
            <label>Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value as ContactSource)}>
              {sources.map((opt) => (
                <option key={opt} value={opt}>
                  {titleCase(opt)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Tags (comma separated)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
