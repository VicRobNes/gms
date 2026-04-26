import { describe, expect, it } from 'vitest';
import app from '../frontend/server/index.js';

describe('tourism crm api', () => {
  let token = '';

  it('returns health response', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('authenticates demo user and reads bootstrap metadata', async () => {
    const authRes = await app.request('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@summittrails.example' })
    });

    expect(authRes.status).toBe(200);
    const authBody = await authRes.json();
    token = authBody.token;

    const bootstrapRes = await app.request('/api/crm/bootstrap', {
      headers: { authorization: `Bearer ${token}` }
    });

    expect(bootstrapRes.status).toBe(200);
    const bootstrapBody = await bootstrapRes.json();
    expect(bootstrapBody.enums.leadStages).toContain('won');
  });

  it('runs full crm lifecycle with CRUD and analytics', async () => {
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const contactRes = await app.request('/api/crm/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Traveler',
        email: 'jane@example.com',
        source: 'instagram',
        tags: ['beach'],
        country: 'US'
      })
    });
    expect(contactRes.status).toBe(201);
    const contact = await contactRes.json();

    const patchContact = await app.request(`/api/crm/contacts/${contact.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ notes: 'High intent honeymoon client' })
    });
    expect(patchContact.status).toBe(200);

    const leadRes = await app.request('/api/crm/leads', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contactId: contact.id,
        pipeline: 'luxury',
        budget: 12000,
        travelWindow: '2026-07',
        destinationInterests: ['Bali']
      })
    });
    expect(leadRes.status).toBe(201);
    const lead = await leadRes.json();

    const campaignRes = await app.request('/api/crm/campaigns', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Summer Bali Luxury',
        channel: 'meta_ads',
        audienceTag: 'luxury-beach',
        spendCents: 500000
      })
    });
    expect(campaignRes.status).toBe(201);
    const campaign = await campaignRes.json();

    const metricsRes = await app.request(`/api/crm/campaigns/${campaign.id}/metrics`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ impressions: 10000, clicks: 800, leadsGenerated: 30, status: 'active' })
    });
    expect(metricsRes.status).toBe(200);

    const tripRes = await app.request('/api/crm/trips', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        leadId: lead.id,
        destination: 'Bali',
        travelers: 2,
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        packageType: 'custom',
        totalValueCents: 650000
      })
    });
    expect(tripRes.status).toBe(201);
    const trip = await tripRes.json();

    const taskRes = await app.request('/api/crm/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Send proposal PDF',
        type: 'proposal',
        dueAt: '2026-06-01T12:00:00.000Z',
        leadId: lead.id,
        priority: 'high'
      })
    });
    expect(taskRes.status).toBe(201);
    const task = await taskRes.json();

    const doneRes = await app.request(`/api/crm/tasks/${task.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'done' })
    });
    expect(doneRes.status).toBe(200);

    const bookRes = await app.request(`/api/crm/trips/${trip.id}/book`, {
      method: 'PATCH',
      headers
    });
    expect(bookRes.status).toBe(200);

    const leadsList = await app.request('/api/crm/leads?stage=won&page=1&pageSize=10', {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(leadsList.status).toBe(200);
    const leadsListBody = await leadsList.json();
    expect(leadsListBody.total).toBeGreaterThanOrEqual(1);

    const dashboardRes = await app.request('/api/crm/dashboard', {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(dashboardRes.status).toBe(200);
    const dashboard = await dashboardRes.json();
    expect(dashboard.pipeline.wonLeads).toBeGreaterThanOrEqual(1);
    expect(dashboard.marketing.activeCampaigns).toBeGreaterThanOrEqual(1);

    const deleteTask = await app.request(`/api/crm/tasks/${task.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(deleteTask.status).toBe(204);
  });

  it('exposes /auth/me, lead stage shortcut, lead notes, and team management', async () => {
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const meRes = await app.request('/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
    expect(meRes.status).toBe(200);
    const me = await meRes.json();
    expect(me.user.email).toBe('owner@summittrails.example');
    expect(me.organization?.id).toBeDefined();

    const usersRes = await app.request('/api/crm/users', { headers: { authorization: `Bearer ${token}` } });
    expect(usersRes.status).toBe(200);
    const users = await usersRes.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(4);

    const inviteRes = await app.request('/api/crm/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Sam Tester', email: `tester+${Date.now()}@example.com`, role: 'agent' })
    });
    expect(inviteRes.status).toBe(201);

    const leadsRes = await app.request('/api/crm/leads?pageSize=100', { headers: { authorization: `Bearer ${token}` } });
    const leadsBody = await leadsRes.json();
    const seedLead = leadsBody.items[0];
    expect(seedLead).toBeDefined();

    const stageRes = await app.request(`/api/crm/leads/${seedLead.id}/stage`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stage: 'qualified' })
    });
    expect(stageRes.status).toBe(200);
    expect((await stageRes.json()).stage).toBe('qualified');

    const noteRes = await app.request(`/api/crm/leads/${seedLead.id}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: 'Followed up via email' })
    });
    expect(noteRes.status).toBe(201);

    const notesList = await app.request(`/api/crm/leads/${seedLead.id}/notes`, {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(notesList.status).toBe(200);
    expect((await notesList.json()).length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unauthenticated access', async () => {
    const res = await app.request('/api/crm/dashboard');
    expect(res.status).toBe(401);
  });
});
