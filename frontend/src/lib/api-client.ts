import type { ContactListResponse, DashboardViewModel, LeadListResponse, TaskListResponse } from './types.js';

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {})
      }
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${await res.text()}`);
    }

    return (await res.json()) as T;
  }

  dashboard() {
    return this.request<DashboardViewModel>('/api/crm/dashboard');
  }

  contacts(page = 1) {
    return this.request<ContactListResponse>(`/api/crm/contacts?page=${page}`);
  }

  leads(stage?: string) {
    const query = stage ? `?stage=${encodeURIComponent(stage)}` : '';
    return this.request<LeadListResponse>(`/api/crm/leads${query}`);
  }

  tasks() {
    return this.request<TaskListResponse>('/api/crm/tasks');
  }
}
