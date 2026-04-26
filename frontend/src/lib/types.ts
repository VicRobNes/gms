import type { DashboardSnapshot, PagedResponse } from '../../../src/contracts.js';
import type { Contact, Lead, Task } from '../../../src/types.js';

export type DashboardViewModel = DashboardSnapshot;
export type ContactListResponse = PagedResponse<Contact>;
export type LeadListResponse = PagedResponse<Lead>;
export type TaskListResponse = Task[];
