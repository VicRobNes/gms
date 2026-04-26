import { describe, expect, it } from 'vitest';
import app from '../src/index.js';

describe('tourism crm api', () => {
  let token = '';

  it('returns health response', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('authenticates demo user', async () => {
    const res = await app.request('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@summittrails.example' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    token = body.token;
    expect(token).toContain('demo_');
  });

  it('creates end-to-end crm flow', async () => {
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    };

    const contactRes = await app.request('/api/crm/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Traveler',
        email: 'jane@example.com',
        source: 'instagram',
        tags: ['beach', 'summer'],
        country: 'US'
      })
    });
    expect(contactRes.status).toBe(201);
    const contact = await contactRes.json();

    const leadRes = await app.request('/api/crm/leads', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contactId: contact.id,
        pipeline: 'luxury',
        stage: 'new',
        budget: 12000,
        travelWindow: '2026-07',
        destinationInterests: ['Bali']
      })
    });
    expect(leadRes.status).toBe(201);
    const lead = await leadRes.json();

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

    const bookRes = await app.request(`/api/crm/trips/${trip.id}/book`, {
      method: 'PATCH',
      headers
    });
    expect(bookRes.status).toBe(200);

    const dashRes = await app.request('/api/crm/dashboard', {
      headers: { authorization: `Bearer ${token}` }
    });

    expect(dashRes.status).toBe(200);
    const dashboard = await dashRes.json();
    expect(dashboard.pipeline.wonLeads).toBeGreaterThanOrEqual(1);
  });
});
