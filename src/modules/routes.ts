import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthContext } from '../lib/auth.js';
import { store } from '../lib/store.js';
import {
  createCampaignSchema,
  createContactSchema,
  createLeadSchema,
  createTaskSchema,
  createTripSchema
} from '../lib/validation.js';

const now = () => new Date().toISOString();

export const api = new Hono<AuthContext>();

api.get('/health', (c) => c.json({ ok: true, service: 'tourism-crm-api' }));

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

api.get('/crm/dashboard', (c) => {
  const orgId = c.get('organizationId');
  const leads = [...store.leads.values()].filter((lead) => lead.organizationId === orgId);
  const trips = [...store.trips.values()].filter((trip) => trip.organizationId === orgId);
  const campaigns = [...store.campaigns.values()].filter((camp) => camp.organizationId === orgId);

  const wonLeads = leads.filter((lead) => lead.stage === 'won').length;
  const openTasks = [...store.tasks.values()].filter(
    (task) => task.organizationId === orgId && task.status !== 'done'
  ).length;
  const revenue = trips
    .filter((trip) => trip.status === 'booked')
    .reduce((sum, trip) => sum + trip.totalValueCents, 0);

  return c.json({
    pipeline: {
      totalLeads: leads.length,
      wonLeads,
      conversionRate: leads.length ? wonLeads / leads.length : 0
    },
    marketing: {
      activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
      attributedLeads: campaigns.reduce((sum, campaign) => sum + campaign.leadsGenerated, 0)
    },
    operations: { openTasks, bookedRevenueCents: revenue }
  });
});

api.get('/crm/contacts', (c) => {
  const orgId = c.get('organizationId');
  return c.json([...store.contacts.values()].filter((contact) => contact.organizationId === orgId));
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

api.get('/crm/leads', (c) => {
  const orgId = c.get('organizationId');
  return c.json([...store.leads.values()].filter((lead) => lead.organizationId === orgId));
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

api.patch('/crm/campaigns/:id/metrics', async (c) => {
  const metrics = z
    .object({
      impressions: z.number().int().nonnegative().optional(),
      clicks: z.number().int().nonnegative().optional(),
      leadsGenerated: z.number().int().nonnegative().optional(),
      bookingsGenerated: z.number().int().nonnegative().optional(),
      status: z.enum(['draft', 'active', 'paused', 'completed']).optional()
    })
    .parse(await c.req.json());

  const campaign = store.campaigns.get(c.req.param('id'));
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  Object.assign(campaign, metrics);
  store.campaigns.set(campaign.id, campaign);

  return c.json(campaign);
});

api.post('/crm/trips', async (c) => {
  const orgId = c.get('organizationId');
  const payload = createTripSchema.parse(await c.req.json());
  const lead = store.leads.get(payload.leadId);
  if (!lead) return c.json({ error: 'leadId does not exist' }, 400);

  const trip = store.create(store.trips, {
    organizationId: orgId,
    ...payload,
    status: 'draft',
    createdAt: now()
  });

  return c.json(trip, 201);
});

api.patch('/crm/trips/:id/book', (c) => {
  const trip = store.trips.get(c.req.param('id'));
  if (!trip) return c.json({ error: 'Trip not found' }, 404);

  trip.status = 'booked';
  store.trips.set(trip.id, trip);

  const lead = store.leads.get(trip.leadId);
  if (lead) {
    lead.stage = 'won';
    lead.updatedAt = now();
    store.leads.set(lead.id, lead);
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

api.patch('/crm/tasks/:id/status', async (c) => {
  const body = z.object({ status: z.enum(['todo', 'doing', 'done']) }).parse(await c.req.json());
  const task = store.tasks.get(c.req.param('id'));
  if (!task) return c.json({ error: 'Task not found' }, 404);

  task.status = body.status;
  store.tasks.set(task.id, task);

  return c.json(task);
});
