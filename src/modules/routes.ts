import { Hono } from 'hono';
import { z } from 'zod';
import type { DashboardSnapshot } from '../contracts.js';
import { authMiddleware, type AuthContext } from '../lib/auth.js';
import { paginate, parsePagination } from '../lib/http.js';
import { store } from '../lib/store.js';
import {
  createCampaignSchema,
  createContactSchema,
  createLeadSchema,
  createTaskSchema,
  createTripSchema,
  patchCampaignMetricsSchema,
  patchTaskStatusSchema,
  updateContactSchema,
  updateLeadSchema,
  updateTaskSchema,
  updateTripSchema
} from '../lib/validation.js';

const now = () => new Date().toISOString();

export const api = new Hono<AuthContext>();

const notFound = (entity: string) => ({ error: `${entity} not found` });

api.get('/health', (c) => c.json({ ok: true, service: 'tourism-crm-api', timestamp: now() }));

api.post('/auth/demo-login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = z.string().email().parse(body.email ?? 'owner@summittrails.example');

  const user = [...store.users.values()].find((u) => u.email === email);
  if (!user) return c.json({ error: 'User not found' }, 404);

  const session = [...store.sessions.values()].find((s) => s.userId === user.id);
  if (!session) return c.json({ error: 'Session unavailable' }, 500);

  return c.json({ token: session.token, user, organization: store.organizations.get(user.organizationId) });
});

api.use('/crm/*', authMiddleware);

api.get('/crm/bootstrap', (c) => {
  const orgId = c.get('organizationId');
  return c.json({
    organization: store.organizations.get(orgId),
    users: [...store.users.values()].filter((u) => u.organizationId === orgId),
    enums: {
      leadStages: ['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'],
      taskTypes: ['follow_up', 'proposal', 'itinerary', 'payment'],
      campaignChannels: ['email', 'sms', 'meta_ads', 'google_ads', 'whatsapp']
    }
  });
});

api.get('/crm/dashboard', (c) => {
  const orgId = c.get('organizationId');
  const leads = [...store.leads.values()].filter((lead) => lead.organizationId === orgId);
  const trips = [...store.trips.values()].filter((trip) => trip.organizationId === orgId);
  const campaigns = [...store.campaigns.values()].filter((camp) => camp.organizationId === orgId);
  const tasks = [...store.tasks.values()].filter((task) => task.organizationId === orgId);

  const wonLeads = leads.filter((lead) => lead.stage === 'won').length;
  const stageCounts = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] ?? 0) + 1;
    return acc;
  }, {});

  const today = Date.now();
  const snapshot: DashboardSnapshot = {
    pipeline: {
      totalLeads: leads.length,
      wonLeads,
      conversionRate: leads.length ? wonLeads / leads.length : 0,
      leadsByStage: stageCounts
    },
    marketing: {
      activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
      spendCents: campaigns.reduce((sum, campaign) => sum + campaign.spendCents, 0),
      attributedLeads: campaigns.reduce((sum, campaign) => sum + campaign.leadsGenerated, 0),
      attributedBookings: campaigns.reduce((sum, campaign) => sum + campaign.bookingsGenerated, 0),
      ctr:
        campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0) > 0
          ? campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0) /
            campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0)
          : 0
    },
    operations: {
      openTasks: tasks.filter((task) => task.status !== 'done').length,
      overdueTasks: tasks.filter((task) => task.status !== 'done' && Date.parse(task.dueAt) < today).length,
      bookedRevenueCents: trips
        .filter((trip) => trip.status === 'booked')
        .reduce((sum, trip) => sum + trip.totalValueCents, 0)
    }
  };

  return c.json(snapshot);
});

api.get('/crm/contacts', (c) => {
  const orgId = c.get('organizationId');
  const { page, pageSize, search } = parsePagination(c);

  const records = [...store.contacts.values()].filter(
    (contact) =>
      contact.organizationId === orgId &&
      (!search || `${contact.firstName} ${contact.lastName} ${contact.email}`.toLowerCase().includes(search))
  );

  return c.json(paginate(records, page, pageSize));
});

api.get('/crm/contacts/:id', (c) => {
  const contact = store.contacts.get(c.req.param('id'));
  return contact ? c.json(contact) : c.json(notFound('Contact'), 404);
});

api.post('/crm/contacts', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createContactSchema.parse(await c.req.json());

  const contact = store.create(store.contacts, {
    organizationId: orgId,
    ...payload,
    createdAt: now()
  });

  return c.json(contact, 201);
});

api.patch('/crm/contacts/:id', async (c) => {
  const contact = store.contacts.get(c.req.param('id'));
  if (!contact) return c.json(notFound('Contact'), 404);

  Object.assign(contact, updateContactSchema.parse(await c.req.json()));
  return c.json(contact);
});

api.delete('/crm/contacts/:id', (c) => {
  const exists = store.contacts.delete(c.req.param('id'));
  return exists ? c.body(null, 204) : c.json(notFound('Contact'), 404);
});

api.get('/crm/leads', (c) => {
  const orgId = c.get('organizationId');
  const { page, pageSize, search } = parsePagination(c);
  const stage = c.req.query('stage');

  const records = [...store.leads.values()].filter(
    (lead) =>
      lead.organizationId === orgId &&
      (!stage || lead.stage === stage) &&
      (!search || lead.destinationInterests.join(' ').toLowerCase().includes(search))
  );

  return c.json(paginate(records, page, pageSize));
});

api.post('/crm/leads', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createLeadSchema.parse(await c.req.json());
  if (!store.contacts.get(payload.contactId)) {
    return c.json({ error: 'contactId does not exist' }, 400);
  }

  const lead = store.create(store.leads, {
    organizationId: orgId,
    ...payload,
    createdAt: now(),
    updatedAt: now()
  });

  return c.json(lead, 201);
});

api.patch('/crm/leads/:id', async (c) => {
  const lead = store.leads.get(c.req.param('id'));
  if (!lead) return c.json(notFound('Lead'), 404);

  Object.assign(lead, updateLeadSchema.parse(await c.req.json()), { updatedAt: now() });
  return c.json(lead);
});

api.post('/crm/campaigns', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createCampaignSchema.parse(await c.req.json());

  const campaign = store.create(store.campaigns, {
    organizationId: orgId,
    ...payload,
    status: 'draft',
    impressions: 0,
    clicks: 0,
    leadsGenerated: 0,
    bookingsGenerated: 0,
    createdAt: now()
  });

  return c.json(campaign, 201);
});

api.get('/crm/campaigns', (c) => {
  const orgId = c.get('organizationId');
  const status = c.req.query('status');
  return c.json(
    [...store.campaigns.values()].filter(
      (campaign) => campaign.organizationId === orgId && (!status || campaign.status === status)
    )
  );
});

api.patch('/crm/campaigns/:id/metrics', async (c) => {
  const campaign = store.campaigns.get(c.req.param('id'));
  if (!campaign) return c.json(notFound('Campaign'), 404);

  Object.assign(campaign, patchCampaignMetricsSchema.parse(await c.req.json()));
  return c.json(campaign);
});

api.post('/crm/trips', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createTripSchema.parse(await c.req.json());
  if (!store.leads.get(payload.leadId)) return c.json({ error: 'leadId does not exist' }, 400);

  const trip = store.create(store.trips, {
    organizationId: orgId,
    ...payload,
    status: 'draft',
    createdAt: now()
  });

  return c.json(trip, 201);
});

api.get('/crm/trips', (c) => {
  const orgId = c.get('organizationId');
  const status = c.req.query('status');
  return c.json(
    [...store.trips.values()].filter((trip) => trip.organizationId === orgId && (!status || trip.status === status))
  );
});

api.patch('/crm/trips/:id', async (c) => {
  const trip = store.trips.get(c.req.param('id'));
  if (!trip) return c.json(notFound('Trip'), 404);

  Object.assign(trip, updateTripSchema.parse(await c.req.json()));
  return c.json(trip);
});

api.patch('/crm/trips/:id/book', (c) => {
  const trip = store.trips.get(c.req.param('id'));
  if (!trip) return c.json(notFound('Trip'), 404);

  trip.status = 'booked';
  const lead = store.leads.get(trip.leadId);
  if (lead) {
    lead.stage = 'won';
    lead.updatedAt = now();
  }

  return c.json(trip);
});

api.post('/crm/tasks', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createTaskSchema.parse(await c.req.json());

  const task = store.create(store.tasks, {
    organizationId: orgId,
    ...payload,
    status: 'todo',
    createdAt: now()
  });

  return c.json(task, 201);
});

api.get('/crm/tasks', (c) => {
  const orgId = c.get('organizationId');
  const status = c.req.query('status');
  const ownerId = c.req.query('ownerId');

  return c.json(
    [...store.tasks.values()].filter(
      (task) =>
        task.organizationId === orgId &&
        (!status || task.status === status) &&
        (!ownerId || task.ownerId === ownerId)
    )
  );
});

api.patch('/crm/tasks/:id', async (c) => {
  const task = store.tasks.get(c.req.param('id'));
  if (!task) return c.json(notFound('Task'), 404);

  Object.assign(task, updateTaskSchema.parse(await c.req.json()));
  return c.json(task);
});

api.patch('/crm/tasks/:id/status', async (c) => {
  const task = store.tasks.get(c.req.param('id'));
  if (!task) return c.json(notFound('Task'), 404);

  task.status = patchTaskStatusSchema.parse(await c.req.json()).status;
  return c.json(task);
});

api.delete('/crm/tasks/:id', (c) => {
  const exists = store.tasks.delete(c.req.param('id'));
  return exists ? c.body(null, 204) : c.json(notFound('Task'), 404);
});
