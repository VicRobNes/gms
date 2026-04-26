'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import { formatCents, formatDateTime, titleCase } from '../../../lib/format';
import type { Contact, Lead, LeadNote, LeadPipeline, LeadStage } from '../../../lib/types';

const STAGES: LeadStage[] = ['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];

export default function LeadsPage() {
  const { api, bootstrap } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelineFilter, setPipelineFilter] = useState<LeadPipeline | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [reload, setReload] = useState(0);
  const [draggingStage, setDraggingStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      api.leads({ pipeline: pipelineFilter || undefined, pageSize: 100 }),
      api.contacts({ pageSize: 100 })
    ])
      .then(([ld, ct]) => {
        if (cancelled) return;
        setLeads(ld.items);
        setContacts(ct.items);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load leads'));
    return () => {
      cancelled = true;
    };
  }, [api, pipelineFilter, reload]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const moveLead = async (lead: Lead, stage: LeadStage) => {
    if (lead.stage === stage) return;
    const previous = leads;
    setLeads((curr) => curr.map((l) => (l.id === lead.id ? { ...l, stage } : l)));
    try {
      await api.setLeadStage(lead.id, stage);
    } catch (err) {
      setLeads(previous);
      setError(err instanceof ApiError ? err.message : 'Failed to update stage');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leads pipeline</h1>
          <p className="subtitle">Drag a lead between stages to advance it.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={contacts.length === 0}>
          + New lead
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <select
          value={pipelineFilter}
          onChange={(e) => setPipelineFilter(e.target.value as LeadPipeline | '')}
          style={{ maxWidth: 200 }}
        >
          <option value="">All pipelines</option>
          {(bootstrap?.enums.leadPipelines ?? ['inbound', 'groups', 'luxury', 'adventure']).map((p) => (
            <option key={p} value={p}>
              {titleCase(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="kanban">
        {STAGES.map((stage) => {
          const inStage = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              className={`kanban-column ${draggingStage === stage ? 'drop-target' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingStage(stage);
              }}
              onDragLeave={() => setDraggingStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingStage(null);
                const id = e.dataTransfer.getData('text/plain');
                const lead = leads.find((l) => l.id === id);
                if (lead) moveLead(lead, stage);
              }}
            >
              <h3>
                {titleCase(stage)}
                <span>{inStage.length}</span>
              </h3>
              {inStage.map((lead) => {
                const contact = contactById.get(lead.contactId);
                return (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', lead.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => setActiveLead(lead)}
                  >
                    <div className="destinations">{lead.destinationInterests.join(', ') || '—'}</div>
                    <div className="meta">
                      {contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown contact'} · {formatCents(lead.budget * 100)}
                    </div>
                    <div className="meta">
                      <Badge value={lead.pipeline} kind="status" />
                    </div>
                  </div>
                );
              })}
              {inStage.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No leads</div>}
            </div>
          );
        })}
      </div>

      {creating && (
        <CreateLeadModal
          contacts={contacts}
          pipelines={bootstrap?.enums.leadPipelines ?? ['inbound', 'groups', 'luxury', 'adventure']}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReload((n) => n + 1);
          }}
        />
      )}

      {activeLead && (
        <LeadDetailModal
          lead={activeLead}
          contact={contactById.get(activeLead.contactId)}
          onClose={() => setActiveLead(null)}
          onChanged={() => {
            setActiveLead(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateLeadModal({
  contacts,
  pipelines,
  onClose,
  onCreated
}: {
  contacts: Contact[];
  pipelines: LeadPipeline[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '');
  const [pipeline, setPipeline] = useState<LeadPipeline>(pipelines[0] ?? 'inbound');
  const [budget, setBudget] = useState(5000);
  const [travelWindow, setTravelWindow] = useState('2026-Q3');
  const [destinations, setDestinations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createLead({
        contactId,
        pipeline,
        budget: Number(budget) || 0,
        travelWindow,
        destinationInterests: destinations
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="New lead"
      description="Capture an opportunity for a traveler in your CRM."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Create lead'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Contact</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} required>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Pipeline</label>
            <select value={pipeline} onChange={(e) => setPipeline(e.target.value as LeadPipeline)}>
              {pipelines.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Budget (USD)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>Travel window</label>
          <input className="input" value={travelWindow} onChange={(e) => setTravelWindow(e.target.value)} required />
        </div>
        <div className="field">
          <label>Destinations (comma separated)</label>
          <input
            className="input"
            value={destinations}
            onChange={(e) => setDestinations(e.target.value)}
            placeholder="Bali, Maldives"
            required
          />
        </div>
      </form>
    </Modal>
  );
}

function LeadDetailModal({
  lead,
  contact,
  onClose,
  onChanged
}: {
  lead: Lead;
  contact: Contact | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { api } = useAuth();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .leadNotes(lead.id)
      .then((data) => !cancelled && setNotes(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load notes'));
    return () => {
      cancelled = true;
    };
  }, [api, lead.id]);

  const addNote = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createLeadNote(lead.id, body.trim());
      setNotes((curr) => [created, ...curr]);
      setBody('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save note');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.deleteLead(lead.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <Modal
      open
      title={contact ? `${contact.firstName} ${contact.lastName}` : 'Lead detail'}
      description={`${titleCase(lead.pipeline)} · ${formatCents(lead.budget * 100)} · ${lead.travelWindow}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" type="button" onClick={remove}>
            Delete lead
          </button>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row" style={{ gap: 6 }}>
          <Badge value={lead.stage} kind="stage" />
          {lead.destinationInterests.map((d) => (
            <span key={d} className="badge">
              {d}
            </span>
          ))}
        </div>

        <div>
          <div className="section-title">Notes</div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <textarea
              value={body}
              placeholder="Add a note about this lead…"
              onChange={(e) => setBody(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <button className="btn btn-primary" type="button" onClick={addNote} disabled={submitting || !body.trim()}>
            {submitting ? 'Saving…' : 'Add note'}
          </button>

          <div className="notes-list" style={{ marginTop: 14 }}>
            {notes.map((note) => (
              <div key={note.id} className="note-item">
                <div>{note.body}</div>
                <div className="meta">{formatDateTime(note.createdAt)}</div>
              </div>
            ))}
            {notes.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>No notes yet.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
