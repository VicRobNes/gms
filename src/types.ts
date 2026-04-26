export type Id = string;

export interface Organization {
  id: Id;
  name: string;
  timezone: string;
  createdAt: string;
}

export interface User {
  id: Id;
  organizationId: Id;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'agent' | 'analyst';
  createdAt: string;
}

export interface Contact {
  id: Id;
  organizationId: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: 'website' | 'instagram' | 'facebook' | 'partner' | 'referral' | 'walk_in';
  tags: string[];
  country: string;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: Id;
  organizationId: Id;
  contactId: Id;
  pipeline: 'inbound' | 'groups' | 'luxury' | 'adventure';
  stage: 'new' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';
  budget: number;
  travelWindow: string;
  destinationInterests: string[];
  assignedTo?: Id;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: Id;
  organizationId: Id;
  name: string;
  channel: 'email' | 'sms' | 'meta_ads' | 'google_ads' | 'whatsapp';
  status: 'draft' | 'active' | 'paused' | 'completed';
  audienceTag: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  leadsGenerated: number;
  bookingsGenerated: number;
  createdAt: string;
}

export interface TripRequest {
  id: Id;
  organizationId: Id;
  leadId: Id;
  destination: string;
  travelers: number;
  startDate: string;
  endDate: string;
  packageType: 'all_inclusive' | 'custom' | 'honeymoon' | 'group';
  status: 'draft' | 'quoted' | 'booked' | 'cancelled';
  totalValueCents: number;
  createdAt: string;
}

export interface Task {
  id: Id;
  organizationId: Id;
  title: string;
  type: 'follow_up' | 'proposal' | 'itinerary' | 'payment';
  dueAt: string;
  status: 'todo' | 'doing' | 'done';
  ownerId?: Id;
  leadId?: Id;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface LeadNote {
  id: Id;
  organizationId: Id;
  leadId: Id;
  authorId: Id;
  body: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  userId: Id;
  organizationId: Id;
  expiresAt: string;
}
