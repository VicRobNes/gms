export type Role = 'owner' | 'admin' | 'agent' | 'analyst';

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
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
