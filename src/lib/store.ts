import crypto from 'node:crypto';
import type {
  AuthSession,
  Campaign,
  Contact,
  Id,
  Lead,
  Organization,
  Task,
  TripRequest,
  User
} from '../types.js';

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

class InMemoryStore {
  organizations = new Map<Id, Organization>();
  users = new Map<Id, User>();
  contacts = new Map<Id, Contact>();
  leads = new Map<Id, Lead>();
  campaigns = new Map<Id, Campaign>();
  trips = new Map<Id, TripRequest>();
  tasks = new Map<Id, Task>();
  sessions = new Map<string, AuthSession>();

  seed() {
    if (this.organizations.size > 0) return;
    const orgId = id();
    const userId = id();

    this.organizations.set(orgId, {
      id: orgId,
      name: 'Summit Trails Tourism Marketing',
      timezone: 'America/New_York',
      createdAt: now()
    });

    this.users.set(userId, {
      id: userId,
      organizationId: orgId,
      email: 'owner@summittrails.example',
      name: 'Agency Owner',
      role: 'owner',
      createdAt: now()
    });

    const token = `demo_${crypto.randomBytes(16).toString('hex')}`;
    this.sessions.set(token, {
      token,
      userId,
      organizationId: orgId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    });
  }

  create<T extends { id: Id }>(collection: Map<Id, T>, data: Omit<T, 'id'>): T {
    const entity = { id: id(), ...data } as T;
    collection.set(entity.id, entity);
    return entity;
  }
}

export const store = new InMemoryStore();
store.seed();
