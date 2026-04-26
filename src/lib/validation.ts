import { z } from 'zod';

const idSchema = z.string().uuid();

export const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.enum(['website', 'instagram', 'facebook', 'partner', 'referral', 'walk_in']),
  tags: z.array(z.string()).default([]),
  country: z.string().min(2),
  notes: z.string().optional()
});

export const updateContactSchema = createContactSchema.partial();

export const createLeadSchema = z.object({
  contactId: idSchema,
  pipeline: z.enum(['inbound', 'groups', 'luxury', 'adventure']),
  stage: z.enum(['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']).default('new'),
  budget: z.number().nonnegative(),
  travelWindow: z.string().min(3),
  destinationInterests: z.array(z.string()).min(1),
  assignedTo: idSchema.optional()
});

export const updateLeadSchema = createLeadSchema.partial().omit({ contactId: true });

export const createCampaignSchema = z.object({
  name: z.string().min(3),
  channel: z.enum(['email', 'sms', 'meta_ads', 'google_ads', 'whatsapp']),
  audienceTag: z.string().min(1),
  spendCents: z.number().int().nonnegative().default(0)
});

export const patchCampaignMetricsSchema = z.object({
  impressions: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  leadsGenerated: z.number().int().nonnegative().optional(),
  bookingsGenerated: z.number().int().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  spendCents: z.number().int().nonnegative().optional()
});

export const createTripSchema = z.object({
  leadId: idSchema,
  destination: z.string().min(2),
  travelers: z.number().int().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  packageType: z.enum(['all_inclusive', 'custom', 'honeymoon', 'group']),
  totalValueCents: z.number().int().nonnegative().default(0)
});

export const updateTripSchema = createTripSchema.partial().omit({ leadId: true });

export const createTaskSchema = z.object({
  title: z.string().min(3),
  type: z.enum(['follow_up', 'proposal', 'itinerary', 'payment']),
  dueAt: z.string().datetime(),
  ownerId: idSchema.optional(),
  leadId: idSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export const updateTaskSchema = createTaskSchema.partial();

export const patchTaskStatusSchema = z.object({ status: z.enum(['todo', 'doing', 'done']) });
