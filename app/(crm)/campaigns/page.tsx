'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../components/Modal';
import { Badge } from '../../../components/Badge';
import { formatCents, formatPercent, titleCase } from '../../../lib/format';
import type { Campaign, CampaignChannel, CampaignStatus } from '../../../lib/types';

export default function CampaignsPage() {
  const { api, bootstrap } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Campaign | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .campaigns({ status: statusFilter || undefined })
      .then((data) => !cancelled && setCampaigns(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load campaigns'));
    return () => {
      cancelled = true;
    };
  }, [api, statusFilter, reload]);

  const remove = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api.deleteCampaign(id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete campaign');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p className="subtitle">{campaigns.length} active across all channels</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New campaign
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | '')}
          style={{ maxWidth: 200 }}
        >
          <option value="">All statuses</option>
          {(bootstrap?.enums.campaignStatuses ?? ['draft', 'active', 'paused', 'completed']).map((s) => (
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
              <th>Name</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Audience</th>
              <th>Spend</th>
              <th>CTR</th>
              <th>Leads</th>
              <th>Bookings</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;
              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td><span className="badge">{titleCase(c.channel)}</span></td>
                  <td><Badge value={c.status} kind="status" /></td>
                  <td>{c.audienceTag}</td>
                  <td>{formatCents(c.spendCents)}</td>
                  <td>{formatPercent(ctr, 2)}</td>
                  <td>{c.leadsGenerated}</td>
                  <td>{c.bookingsGenerated}</td>
                  <td>
                    <div className="row">
                      <button className="btn btn-ghost" onClick={() => setActive(c)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-danger" onClick={() => remove(c.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateCampaignModal
          channels={bootstrap?.enums.campaignChannels ?? ['email', 'sms', 'meta_ads', 'google_ads', 'whatsapp']}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReload((n) => n + 1);
          }}
        />
      )}

      {active && (
        <EditMetricsModal
          campaign={active}
          statuses={bootstrap?.enums.campaignStatuses ?? ['draft', 'active', 'paused', 'completed']}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  channels,
  onClose,
  onCreated
}: {
  channels: CampaignChannel[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>(channels[0] ?? 'email');
  const [audienceTag, setAudienceTag] = useState('');
  const [spend, setSpend] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createCampaign({ name, channel, audienceTag, spendCents: Math.round(spend * 100) });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="New campaign"
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
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={3} required />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as CampaignChannel)}>
              {channels.map((ch) => (
                <option key={ch} value={ch}>
                  {titleCase(ch)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Audience tag</label>
            <input className="input" value={audienceTag} onChange={(e) => setAudienceTag(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label>Initial spend (USD)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
          />
        </div>
      </form>
    </Modal>
  );
}

function EditMetricsModal({
  campaign,
  statuses,
  onClose,
  onSaved
}: {
  campaign: Campaign;
  statuses: CampaignStatus[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { api } = useAuth();
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [impressions, setImpressions] = useState(campaign.impressions);
  const [clicks, setClicks] = useState(campaign.clicks);
  const [leadsGenerated, setLeads] = useState(campaign.leadsGenerated);
  const [bookingsGenerated, setBookings] = useState(campaign.bookingsGenerated);
  const [spendDollars, setSpendDollars] = useState(campaign.spendCents / 100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.updateCampaignMetrics(campaign.id, {
        status,
        impressions: Number(impressions),
        clicks: Number(clicks),
        leadsGenerated: Number(leadsGenerated),
        bookingsGenerated: Number(bookingsGenerated),
        spendCents: Math.round(Number(spendDollars) * 100)
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save metrics');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title={campaign.name}
      description="Update campaign performance metrics."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-grid">
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Spend (USD)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={spendDollars}
            onChange={(e) => setSpendDollars(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Impressions</label>
          <input
            className="input"
            type="number"
            min={0}
            value={impressions}
            onChange={(e) => setImpressions(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Clicks</label>
          <input
            className="input"
            type="number"
            min={0}
            value={clicks}
            onChange={(e) => setClicks(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Leads generated</label>
          <input
            className="input"
            type="number"
            min={0}
            value={leadsGenerated}
            onChange={(e) => setLeads(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Bookings generated</label>
          <input
            className="input"
            type="number"
            min={0}
            value={bookingsGenerated}
            onChange={(e) => setBookings(Number(e.target.value))}
          />
        </div>
      </div>
    </Modal>
  );
}
