import type {
  AuthSession,
  Campaign,
  Contact,
  Id,
  Lead,
  LeadNote,
  Organization,
  Task,
  TripRequest,
  User
} from '../types.js';
import { hasPersistence, loadSnapshot, saveSnapshot, type StoreSnapshot } from './persistence.js';

const now = () => new Date().toISOString();
const id = () => globalThis.crypto.randomUUID();
const randomToken = () => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const dateOnly = (days: number) => daysFromNow(days).slice(0, 10);

class InMemoryStore {
  organizations = new Map<Id, Organization>();
  users = new Map<Id, User>();
  contacts = new Map<Id, Contact>();
  leads = new Map<Id, Lead>();
  campaigns = new Map<Id, Campaign>();
  trips = new Map<Id, TripRequest>();
  tasks = new Map<Id, Task>();
  leadNotes = new Map<Id, LeadNote>();
  sessions = new Map<string, AuthSession>();

  seed() {
    if (this.organizations.size > 0) return;

    const orgId = id();
    this.organizations.set(orgId, {
      id: orgId,
      name: 'Summit Trails Tourism Marketing',
      timezone: 'America/New_York',
      createdAt: now()
    });

    const owner = this.createUser(orgId, 'owner@summittrails.example', 'Avery Owens', 'owner');
    const adminUser = this.createUser(orgId, 'admin@summittrails.example', 'Morgan Quinn', 'admin');
    const agent = this.createUser(orgId, 'agent@summittrails.example', 'Jordan Rivera', 'agent');
    this.createUser(orgId, 'analyst@summittrails.example', 'Taylor Brooks', 'analyst');

    this.issueSession(owner.id, orgId);
    this.issueSession(adminUser.id, orgId);
    this.issueSession(agent.id, orgId);

    const contactSeed: Array<Omit<Contact, 'id' | 'organizationId' | 'createdAt'>> = [
      {
        firstName: 'Jane',
        lastName: 'Traveler',
        email: 'jane@example.com',
        phone: '+1-555-0100',
        source: 'instagram',
        tags: ['beach', 'honeymoon'],
        country: 'US',
        notes: 'Met at travel expo'
      },
      {
        firstName: 'Marcus',
        lastName: 'Hale',
        email: 'marcus@example.com',
        phone: '+1-555-0101',
        source: 'website',
        tags: ['adventure'],
        country: 'CA',
        notes: 'Mountaineering enthusiast'
      },
      {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya@example.com',
        source: 'referral',
        tags: ['family'],
        country: 'IN'
      },
      {
        firstName: 'Diego',
        lastName: 'Alvarez',
        email: 'diego@example.com',
        phone: '+34-655-010-200',
        source: 'partner',
        tags: ['luxury', 'wine'],
        country: 'ES'
      },
      {
        firstName: 'Sofia',
        lastName: 'Lindqvist',
        email: 'sofia@example.com',
        source: 'facebook',
        tags: ['groups', 'corporate'],
        country: 'SE',
        notes: 'Planning a 25-person retreat'
      }
    ];

    const contacts = contactSeed.map((c) =>
      this.create(this.contacts, { organizationId: orgId, ...c, createdAt: now() })
    );

    const leadSeed: Array<{
      contact: Contact;
      pipeline: Lead['pipeline'];
      stage: Lead['stage'];
      budget: number;
      travelWindow: string;
      destinationInterests: string[];
      assignedTo?: Id;
    }> = [
      {
        contact: contacts[0]!,
        pipeline: 'luxury',
        stage: 'proposal_sent',
        budget: 12000,
        travelWindow: '2026-07',
        destinationInterests: ['Bali', 'Maldives'],
        assignedTo: agent.id
      },
      {
        contact: contacts[1]!,
        pipeline: 'adventure',
        stage: 'qualified',
        budget: 6500,
        travelWindow: '2026-09',
        destinationInterests: ['Patagonia'],
        assignedTo: agent.id
      },
      {
        contact: contacts[2]!,
        pipeline: 'inbound',
        stage: 'new',
        budget: 4200,
        travelWindow: '2026-12',
        destinationInterests: ['Tokyo', 'Kyoto']
      },
      {
        contact: contacts[3]!,
        pipeline: 'luxury',
        stage: 'negotiation',
        budget: 18500,
        travelWindow: '2026-06',
        destinationInterests: ['Tuscany', 'Amalfi Coast'],
        assignedTo: adminUser.id
      },
      {
        contact: contacts[4]!,
        pipeline: 'groups',
        stage: 'won',
        budget: 42000,
        travelWindow: '2026-05',
        destinationInterests: ['Lisbon'],
        assignedTo: owner.id
      }
    ];

    const leads = leadSeed.map((l) =>
      this.create(this.leads, {
        organizationId: orgId,
        contactId: l.contact.id,
        pipeline: l.pipeline,
        stage: l.stage,
        budget: l.budget,
        travelWindow: l.travelWindow,
        destinationInterests: l.destinationInterests,
        assignedTo: l.assignedTo,
        createdAt: now(),
        updatedAt: now()
      })
    );

    const campaignSeed: Array<{
      name: string;
      channel: Campaign['channel'];
      status: Campaign['status'];
      audienceTag: string;
      spendCents: number;
      impressions: number;
      clicks: number;
      leadsGenerated: number;
      bookingsGenerated: number;
    }> = [
      {
        name: 'Summer Bali Luxury',
        channel: 'meta_ads',
        status: 'active',
        audienceTag: 'luxury-beach',
        spendCents: 480000,
        impressions: 184000,
        clicks: 6200,
        leadsGenerated: 38,
        bookingsGenerated: 7
      },
      {
        name: 'Patagonia Trekking',
        channel: 'google_ads',
        status: 'active',
        audienceTag: 'adventure-solo',
        spendCents: 215000,
        impressions: 92000,
        clicks: 2100,
        leadsGenerated: 19,
        bookingsGenerated: 3
      },
      {
        name: 'Spring Honeymoon Newsletter',
        channel: 'email',
        status: 'completed',
        audienceTag: 'newsletter-honeymoon',
        spendCents: 30000,
        impressions: 28000,
        clicks: 4400,
        leadsGenerated: 24,
        bookingsGenerated: 5
      },
      {
        name: 'Group Retreats Q2',
        channel: 'whatsapp',
        status: 'paused',
        audienceTag: 'corporate-retreat',
        spendCents: 95000,
        impressions: 12000,
        clicks: 880,
        leadsGenerated: 11,
        bookingsGenerated: 2
      },
      {
        name: 'Holiday SMS Push',
        channel: 'sms',
        status: 'draft',
        audienceTag: 'returning-clients',
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        leadsGenerated: 0,
        bookingsGenerated: 0
      }
    ];

    campaignSeed.forEach((c) =>
      this.create(this.campaigns, { organizationId: orgId, ...c, createdAt: now() })
    );

    const tripSeed: Array<{
      lead: Lead;
      destination: string;
      travelers: number;
      startDate: string;
      endDate: string;
      packageType: TripRequest['packageType'];
      status: TripRequest['status'];
      totalValueCents: number;
    }> = [
      {
        lead: leads[0]!,
        destination: 'Bali',
        travelers: 2,
        startDate: dateOnly(60),
        endDate: dateOnly(70),
        packageType: 'honeymoon',
        status: 'quoted',
        totalValueCents: 950000
      },
      {
        lead: leads[1]!,
        destination: 'Patagonia',
        travelers: 1,
        startDate: dateOnly(120),
        endDate: dateOnly(135),
        packageType: 'custom',
        status: 'draft',
        totalValueCents: 480000
      },
      {
        lead: leads[3]!,
        destination: 'Tuscany',
        travelers: 4,
        startDate: dateOnly(45),
        endDate: dateOnly(58),
        packageType: 'all_inclusive',
        status: 'quoted',
        totalValueCents: 1450000
      },
      {
        lead: leads[4]!,
        destination: 'Lisbon',
        travelers: 25,
        startDate: dateOnly(20),
        endDate: dateOnly(25),
        packageType: 'group',
        status: 'booked',
        totalValueCents: 4200000
      }
    ];

    tripSeed.forEach((t) =>
      this.create(this.trips, {
        organizationId: orgId,
        leadId: t.lead.id,
        destination: t.destination,
        travelers: t.travelers,
        startDate: t.startDate,
        endDate: t.endDate,
        packageType: t.packageType,
        status: t.status,
        totalValueCents: t.totalValueCents,
        createdAt: now()
      })
    );

    const taskSeed: Array<{
      title: string;
      type: Task['type'];
      dueAt: string;
      status: Task['status'];
      ownerId?: Id;
      leadId?: Id;
      priority: Task['priority'];
    }> = [
      {
        title: 'Send Bali honeymoon proposal',
        type: 'proposal',
        dueAt: daysFromNow(1),
        status: 'doing',
        ownerId: agent.id,
        leadId: leads[0]!.id,
        priority: 'high'
      },
      {
        title: 'Follow up on Patagonia inquiry',
        type: 'follow_up',
        dueAt: daysFromNow(2),
        status: 'todo',
        ownerId: agent.id,
        leadId: leads[1]!.id,
        priority: 'medium'
      },
      {
        title: 'Build Tokyo itinerary draft',
        type: 'itinerary',
        dueAt: daysFromNow(5),
        status: 'todo',
        leadId: leads[2]!.id,
        priority: 'low'
      },
      {
        title: 'Collect deposit for Lisbon retreat',
        type: 'payment',
        dueAt: daysFromNow(-1),
        status: 'todo',
        ownerId: adminUser.id,
        leadId: leads[4]!.id,
        priority: 'high'
      },
      {
        title: 'Confirm vendor contracts Tuscany',
        type: 'follow_up',
        dueAt: daysFromNow(3),
        status: 'doing',
        ownerId: adminUser.id,
        leadId: leads[3]!.id,
        priority: 'medium'
      }
    ];

    taskSeed.forEach((t) => this.create(this.tasks, { organizationId: orgId, ...t, createdAt: now() }));

    this.create(this.leadNotes, {
      organizationId: orgId,
      leadId: leads[0]!.id,
      authorId: agent.id,
      body: 'Client prefers overwater villas, allergic to shellfish.',
      createdAt: now()
    });
    this.create(this.leadNotes, {
      organizationId: orgId,
      leadId: leads[3]!.id,
      authorId: adminUser.id,
      body: 'Negotiating private chef add-on; awaiting partner quote.',
      createdAt: now()
    });
  }

  private createUser(organizationId: Id, email: string, name: string, role: User['role']): User {
    const user: User = { id: id(), organizationId, email, name, role, createdAt: now() };
    this.users.set(user.id, user);
    return user;
  }

  issueSession(userId: Id, organizationId: Id): AuthSession {
    const token = `demo_${randomToken()}`;
    const session: AuthSession = {
      token,
      userId,
      organizationId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    };
    this.sessions.set(token, session);
    return session;
  }

  create<T extends { id: Id }>(collection: Map<Id, T>, data: Omit<T, 'id'>): T {
    const entity = { id: id(), ...data } as T;
    collection.set(entity.id, entity);
    return entity;
  }

  serialize(): StoreSnapshot {
    return {
      organizations: [...this.organizations.values()],
      users: [...this.users.values()],
      contacts: [...this.contacts.values()],
      leads: [...this.leads.values()],
      campaigns: [...this.campaigns.values()],
      trips: [...this.trips.values()],
      tasks: [...this.tasks.values()],
      leadNotes: [...this.leadNotes.values()],
      sessions: [...this.sessions.values()]
    };
  }

  hydrate(snapshot: StoreSnapshot) {
    const replace = <T extends { id: Id }>(target: Map<Id, T>, items: T[]) => {
      target.clear();
      for (const item of items) target.set(item.id, item);
    };
    replace(this.organizations, snapshot.organizations);
    replace(this.users, snapshot.users);
    replace(this.contacts, snapshot.contacts);
    replace(this.leads, snapshot.leads);
    replace(this.campaigns, snapshot.campaigns);
    replace(this.trips, snapshot.trips);
    replace(this.tasks, snapshot.tasks);
    replace(this.leadNotes, snapshot.leadNotes);
    this.sessions.clear();
    for (const s of snapshot.sessions) this.sessions.set(s.token, s);
  }

  async persist(): Promise<void> {
    if (!hasPersistence()) return;
    try {
      await saveSnapshot(this.serialize());
    } catch (err) {
      console.error('[store] failed to persist snapshot', err);
    }
  }
}

export const store = new InMemoryStore();

let readyPromise: Promise<void> | null = null;
export function ensureReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (hasPersistence()) {
      try {
        const snapshot = await loadSnapshot();
        if (snapshot && snapshot.organizations?.length) {
          store.hydrate(snapshot);
          return;
        }
      } catch (err) {
        console.error('[store] failed to load snapshot, falling back to seed', err);
      }
    }
    store.seed();
    if (hasPersistence()) await store.persist();
  })();
  return readyPromise;
}

if (!hasPersistence()) {
  store.seed();
}
