const randomUUID = (): string => globalThis.crypto.randomUUID();

export type Stage = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  amount: number;
  stage: Stage;
  closeDate: string;
  createdAt: string;
}

interface Store {
  contacts: Contact[];
  deals: Deal[];
}

const globalForStore = globalThis as unknown as { __crmStore?: Store };

const seed = (): Store => ({
  contacts: [
    { id: randomUUID(), name: 'Avery Owens', email: 'avery@summittrails.example', company: 'Summit Trails', createdAt: new Date().toISOString() },
    { id: randomUUID(), name: 'Marcus Hale', email: 'marcus@blueridge.example', company: 'Blue Ridge Tours', createdAt: new Date().toISOString() },
    { id: randomUUID(), name: 'Priya Sharma', email: 'priya@coastline.example', company: 'Coastline Getaways', createdAt: new Date().toISOString() }
  ],
  deals: []
});

const ensure = (): Store => {
  if (!globalForStore.__crmStore) {
    const initial = seed();
    initial.deals.push(
      { id: randomUUID(), title: 'Bali honeymoon package', contactId: initial.contacts[0]!.id, amount: 9500, stage: 'proposal', closeDate: '2026-07-12', createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Patagonia trekking trip',   contactId: initial.contacts[1]!.id, amount: 6200, stage: 'qualified', closeDate: '2026-09-03', createdAt: new Date().toISOString() },
      { id: randomUUID(), title: 'Tokyo + Kyoto custom tour', contactId: initial.contacts[2]!.id, amount: 4800, stage: 'new',       closeDate: '2026-12-18', createdAt: new Date().toISOString() }
    );
    globalForStore.__crmStore = initial;
  }
  return globalForStore.__crmStore;
};

export const store = {
  contacts: {
    list(): Contact[] {
      return [...ensure().contacts].sort((a, b) => a.name.localeCompare(b.name));
    },
    create(input: Omit<Contact, 'id' | 'createdAt'>): Contact {
      const contact: Contact = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
      ensure().contacts.push(contact);
      return contact;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.contacts.length;
      s.contacts = s.contacts.filter((c) => c.id !== id);
      s.deals = s.deals.filter((d) => d.contactId !== id);
      return s.contacts.length < before;
    }
  },
  deals: {
    list(): Deal[] {
      return [...ensure().deals].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
    create(input: Omit<Deal, 'id' | 'createdAt'>): Deal {
      const deal: Deal = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
      ensure().deals.push(deal);
      return deal;
    },
    setStage(id: string, stage: Stage): Deal | undefined {
      const deal = ensure().deals.find((d) => d.id === id);
      if (deal) deal.stage = stage;
      return deal;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.deals.length;
      s.deals = s.deals.filter((d) => d.id !== id);
      return s.deals.length < before;
    }
  }
};

export const STAGES: Stage[] = ['new', 'qualified', 'proposal', 'won', 'lost'];
