export type Id = string;

export type UserRole = 'owner' | 'admin' | 'agent' | 'analyst';

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
  role: UserRole;
  createdAt: string;
}

export type ContactSource = 'website' | 'instagram' | 'facebook' | 'partner' | 'referral' | 'walk_in';

export interface Contact {
  id: Id;
  organizationId: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: ContactSource;
  tags: string[];
  country: string;
  notes?: string;
  createdAt: string;
}

export type LeadPipeline = 'inbound' | 'groups' | 'luxury' | 'adventure';
export type LeadStage = 'new' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: Id;
  organizationId: Id;
  contactId: Id;
  pipeline: LeadPipeline;
  stage: LeadStage;
  budget: number;
  travelWindow: string;
  destinationInterests: string[];
  assignedTo?: Id;
  createdAt: string;
  updatedAt: string;
}

export type CampaignChannel = 'email' | 'sms' | 'meta_ads' | 'google_ads' | 'whatsapp';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface Campaign {
  id: Id;
  organizationId: Id;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  audienceTag: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  leadsGenerated: number;
  bookingsGenerated: number;
  createdAt: string;
}

export type PackageType = 'all_inclusive' | 'custom' | 'honeymoon' | 'group';
export type TripStatus = 'draft' | 'quoted' | 'booked' | 'cancelled';

export interface TripRequest {
  id: Id;
  organizationId: Id;
  leadId: Id;
  destination: string;
  travelers: number;
  startDate: string;
  endDate: string;
  packageType: PackageType;
  status: TripStatus;
  totalValueCents: number;
  createdAt: string;
}

export type TaskType = 'follow_up' | 'proposal' | 'itinerary' | 'payment';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: Id;
  organizationId: Id;
  title: string;
  type: TaskType;
  dueAt: string;
  status: TaskStatus;
  ownerId?: Id;
  leadId?: Id;
  priority: TaskPriority;
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

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardSnapshot {
  pipeline: {
    totalLeads: number;
    wonLeads: number;
    conversionRate: number;
    leadsByStage: Record<string, number>;
    pipelineValueCents: number;
  };
  marketing: {
    activeCampaigns: number;
    spendCents: number;
    attributedLeads: number;
    attributedBookings: number;
    ctr: number;
    costPerLeadCents: number;
  };
  operations: {
    openTasks: number;
    overdueTasks: number;
    bookedRevenueCents: number;
    quotedRevenueCents: number;
  };
}

export interface BootstrapResponse {
  organization: Organization;
  users: User[];
  enums: {
    leadStages: LeadStage[];
    leadPipelines: LeadPipeline[];
    taskTypes: TaskType[];
    taskStatuses: TaskStatus[];
    taskPriorities: TaskPriority[];
    campaignChannels: CampaignChannel[];
    campaignStatuses: CampaignStatus[];
    contactSources: ContactSource[];
    packageTypes: PackageType[];
    tripStatuses: TripStatus[];
    userRoles: UserRole[];
  };
}

export interface AuthResponse {
  token: string;
  user: User;
  organization: Organization;
}
