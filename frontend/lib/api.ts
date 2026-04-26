import type {
  AuthResponse,
  BootstrapResponse,
  Campaign,
  CampaignChannel,
  CampaignStatus,
  Contact,
  ContactSource,
  DashboardSnapshot,
  Lead,
  LeadNote,
  LeadPipeline,
  LeadStage,
  PackageType,
  PagedResponse,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TripRequest,
  TripStatus,
  User,
  UserRole
} from './types';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const defaultBaseUrl = () =>
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : '') || 'http://localhost:3000';

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  const search = new URLSearchParams();
  entries.forEach(([k, v]) => search.set(k, String(v)));
  return `?${search.toString()}`;
};

export class ApiClient {
  constructor(private readonly token: string | null = null, private readonly baseUrl: string = defaultBaseUrl()) {}

  withToken(token: string | null) {
    return new ApiClient(token, this.baseUrl);
  }

  private async request<T>(path: string, init?: RequestInit & { skipBody?: boolean }): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined)
    };
    if (this.token) headers.authorization = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers, cache: 'no-store' });

    if (!res.ok) {
      let detail: unknown = undefined;
      let message = res.statusText;
      try {
        const body = await res.json();
        detail = body;
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message, detail);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  health() {
    return this.request<{ ok: boolean; timestamp: string }>('/api/health');
  }

  login(email: string) {
    return this.request<AuthResponse>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  me() {
    return this.request<{ user: User; organization: { id: string; name: string; timezone: string } }>('/api/auth/me');
  }

  logout() {
    return this.request<void>('/api/auth/logout', { method: 'POST' });
  }

  bootstrap() {
    return this.request<BootstrapResponse>('/api/crm/bootstrap');
  }

  dashboard() {
    return this.request<DashboardSnapshot>('/api/crm/dashboard');
  }

  users() {
    return this.request<User[]>('/api/crm/users');
  }

  createUser(input: { email: string; name: string; role: UserRole }) {
    return this.request<User>('/api/crm/users', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  contacts(params: { page?: number; pageSize?: number; search?: string } = {}) {
    return this.request<PagedResponse<Contact>>(`/api/crm/contacts${buildQuery(params)}`);
  }

  contact(id: string) {
    return this.request<Contact>(`/api/crm/contacts/${id}`);
  }

  createContact(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    source: ContactSource;
    tags?: string[];
    country: string;
    notes?: string;
  }) {
    return this.request<Contact>('/api/crm/contacts', {
      method: 'POST',
      body: JSON.stringify({ tags: [], ...input })
    });
  }

  updateContact(id: string, input: Partial<Omit<Contact, 'id' | 'organizationId' | 'createdAt'>>) {
    return this.request<Contact>(`/api/crm/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  deleteContact(id: string) {
    return this.request<void>(`/api/crm/contacts/${id}`, { method: 'DELETE' });
  }

  deleteLead(id: string) {
    return this.request<void>(`/api/crm/leads/${id}`, { method: 'DELETE' });
  }

  deleteCampaign(id: string) {
    return this.request<void>(`/api/crm/campaigns/${id}`, { method: 'DELETE' });
  }

  deleteTrip(id: string) {
    return this.request<void>(`/api/crm/trips/${id}`, { method: 'DELETE' });
  }

  leads(params: { page?: number; pageSize?: number; stage?: LeadStage; pipeline?: LeadPipeline; search?: string; assignedTo?: string } = {}) {
    return this.request<PagedResponse<Lead>>(`/api/crm/leads${buildQuery(params)}`);
  }

  lead(id: string) {
    return this.request<Lead>(`/api/crm/leads/${id}`);
  }

  createLead(input: {
    contactId: string;
    pipeline: LeadPipeline;
    stage?: LeadStage;
    budget: number;
    travelWindow: string;
    destinationInterests: string[];
    assignedTo?: string;
  }) {
    return this.request<Lead>('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  updateLead(id: string, input: Partial<Omit<Lead, 'id' | 'organizationId' | 'contactId' | 'createdAt' | 'updatedAt'>>) {
    return this.request<Lead>(`/api/crm/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  setLeadStage(id: string, stage: LeadStage) {
    return this.request<Lead>(`/api/crm/leads/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage })
    });
  }

  leadNotes(id: string) {
    return this.request<LeadNote[]>(`/api/crm/leads/${id}/notes`);
  }

  createLeadNote(id: string, body: string) {
    return this.request<LeadNote>(`/api/crm/leads/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  }

  campaigns(params: { status?: CampaignStatus; channel?: CampaignChannel } = {}) {
    return this.request<Campaign[]>(`/api/crm/campaigns${buildQuery(params)}`);
  }

  createCampaign(input: { name: string; channel: CampaignChannel; audienceTag: string; spendCents?: number }) {
    return this.request<Campaign>('/api/crm/campaigns', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  updateCampaignMetrics(
    id: string,
    input: Partial<{
      impressions: number;
      clicks: number;
      leadsGenerated: number;
      bookingsGenerated: number;
      status: CampaignStatus;
      spendCents: number;
    }>
  ) {
    return this.request<Campaign>(`/api/crm/campaigns/${id}/metrics`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  trips(params: { status?: TripStatus } = {}) {
    return this.request<TripRequest[]>(`/api/crm/trips${buildQuery(params)}`);
  }

  createTrip(input: {
    leadId: string;
    destination: string;
    travelers: number;
    startDate: string;
    endDate: string;
    packageType: PackageType;
    totalValueCents?: number;
  }) {
    return this.request<TripRequest>('/api/crm/trips', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  bookTrip(id: string) {
    return this.request<TripRequest>(`/api/crm/trips/${id}/book`, { method: 'PATCH' });
  }

  cancelTrip(id: string) {
    return this.request<TripRequest>(`/api/crm/trips/${id}/cancel`, { method: 'PATCH' });
  }

  tasks(params: { status?: TaskStatus; ownerId?: string; leadId?: string } = {}) {
    return this.request<Task[]>(`/api/crm/tasks${buildQuery(params)}`);
  }

  createTask(input: {
    title: string;
    type: TaskType;
    dueAt: string;
    ownerId?: string;
    leadId?: string;
    priority?: TaskPriority;
  }) {
    return this.request<Task>('/api/crm/tasks', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  setTaskStatus(id: string, status: TaskStatus) {
    return this.request<Task>(`/api/crm/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  deleteTask(id: string) {
    return this.request<void>(`/api/crm/tasks/${id}`, { method: 'DELETE' });
  }
}
