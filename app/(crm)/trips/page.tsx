'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import { formatCents, formatDate, titleCase } from '../../../lib/format';
import type { Lead, PackageType, TripRequest, TripStatus } from '../../../lib/types';

export default function TripsPage() {
  const { api, bootstrap } = useAuth();
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([api.trips({ status: statusFilter || undefined }), api.leads({ pageSize: 100 })])
      .then(([t, l]) => {
        if (cancelled) return;
        setTrips(t);
        setLeads(l.items);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load trips'));
    return () => {
      cancelled = true;
    };
  }, [api, statusFilter, reload]);

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const book = async (id: string) => {
    try {
      await api.bookTrip(id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book trip');
    }
  };
  const cancel = async (id: string) => {
    try {
      await api.cancelTrip(id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel trip');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trip requests</h1>
          <p className="subtitle">{trips.length} trips in the pipeline</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={leads.length === 0}>
          + New trip
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TripStatus | '')}
          style={{ maxWidth: 200 }}
        >
          <option value="">All statuses</option>
          {(bootstrap?.enums.tripStatuses ?? ['draft', 'quoted', 'booked', 'cancelled']).map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Lead</th>
              <th>Travelers</th>
              <th>Window</th>
              <th>Package</th>
              <th>Value</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => {
              const lead = leadById.get(trip.leadId);
              return (
                <tr key={trip.id}>
                  <td><strong>{trip.destination}</strong></td>
                  <td>{lead ? lead.destinationInterests.join(', ') || lead.id.slice(0, 6) : trip.leadId.slice(0, 6)}</td>
                  <td>{trip.travelers}</td>
                  <td>
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </td>
                  <td><span className="badge">{titleCase(trip.packageType)}</span></td>
                  <td>{formatCents(trip.totalValueCents)}</td>
                  <td><Badge value={trip.status} kind="status" /></td>
                  <td>
                    <div className="row">
                      {trip.status !== 'booked' && trip.status !== 'cancelled' && (
                        <button className="btn btn-ghost" onClick={() => book(trip.id)}>
                          Book
                        </button>
                      )}
                      {trip.status !== 'cancelled' && trip.status !== 'booked' && (
                        <button className="btn btn-ghost btn-danger" onClick={() => cancel(trip.id)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                  No trip requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateTripModal
          leads={leads}
          packageTypes={bootstrap?.enums.packageTypes ?? ['all_inclusive', 'custom', 'honeymoon', 'group']}
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

function CreateTripModal({
  leads,
  packageTypes,
  onClose,
  onCreated
}: {
  leads: Lead[];
  packageTypes: PackageType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '');
  const [destination, setDestination] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [packageType, setPackageType] = useState<PackageType>(packageTypes[0] ?? 'custom');
  const [valueDollars, setValueDollars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createTrip({
        leadId,
        destination,
        travelers: Number(travelers),
        startDate,
        endDate,
        packageType,
        totalValueCents: Math.round(Number(valueDollars) * 100)
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create trip');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="New trip request"
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
          <label>Lead</label>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)} required>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.destinationInterests.join(', ') || 'Unnamed'} · {titleCase(l.pipeline)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Destination</label>
          <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} required />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Travelers</label>
            <input
              className="input"
              type="number"
              min={1}
              value={travelers}
              onChange={(e) => setTravelers(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <label>Package</label>
            <select value={packageType} onChange={(e) => setPackageType(e.target.value as PackageType)}>
              {packageTypes.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Start date</label>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>End date</label>
            <input
              className="input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>Total value (USD)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={valueDollars}
            onChange={(e) => setValueDollars(Number(e.target.value))}
          />
        </div>
      </form>
    </Modal>
  );
}
