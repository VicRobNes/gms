// Universal CRM data model — six primitives, three joins.
// Stages 1-2 ship: Party, Pipeline, Opportunity, Activity.
// Stage 3+ will add: Task, User. Same store shape.

const randomUUID = (): string => globalThis.crypto.randomUUID();
const now = (): string => new Date().toISOString();

// ---------- Party --------------------------------------------------------
// One table for both people and organizations, discriminated by `kind`.
// A person may belong to an organization via `organizationId`.

export type PartyKind = 'person' | 'organization';

export interface Party {
  id: string;
  kind: PartyKind;
  name: string;
  email?: string;
  phone?: string;
  organizationId?: string; // person → org (only when kind = 'person')
  createdAt: string;
}

// ---------- Pipeline -----------------------------------------------------
// An ordered list of stages. Each stage has a `kind` so the engine knows
// which stages contribute to "open pipeline", "won revenue", etc.
// One Pipeline drives many Opportunities. Multiple pipelines (Sales,
// Campaign Delivery, Onboarding) drop in from Stage 3 with no model change.

export type StageKind = 'open' | 'won' | 'lost';

export interface PipelineStage {
  name: string;
  kind: StageKind;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

// ---------- Opportunity --------------------------------------------------
// A unit of value moving through a Pipeline. Belongs to one primary Party
// (multi-party with role joins land in Stage 5).

export interface Opportunity {
  id: string;
  title: string;
  partyId: string;
  pipelineId: string;
  stage: string; // matches a stage.name in the pipeline
  amount: number;
  closeDate: string;
  createdAt: string;
}

// ---------- Activity -----------------------------------------------------
// Anything that happened. Linked to a Party and/or an Opportunity, so a
// single write surfaces in both feeds. `log` is auto-generated; the others
// are user-entered.

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'log';

export interface Activity {
  id: string;
  type: ActivityType;
  partyId?: string;
  opportunityId?: string;
  body: string;
  at: string;        // when it happened
  createdAt: string; // when it was logged
}

// ---------- DB -----------------------------------------------------------

interface DB {
  parties: Party[];
  pipelines: Pipeline[];
  opportunities: Opportunity[];
  activities: Activity[];
}

const globalForDB = globalThis as unknown as { __crmDB?: DB };

const seed = (): DB => {
  const summit = randomUUID();
  const blueRidge = randomUUID();
  const coastline = randomUUID();

  const parties: Party[] = [
    { id: summit,    kind: 'organization', name: 'Summit Trails',       email: 'hello@summittrails.example', createdAt: now() },
    { id: blueRidge, kind: 'organization', name: 'Blue Ridge Tours',    email: 'hi@blueridge.example',       createdAt: now() },
    { id: coastline, kind: 'organization', name: 'Coastline Getaways',  email: 'team@coastline.example',     createdAt: now() },
    { id: randomUUID(), kind: 'person', name: 'Avery Owens',  email: 'avery@summittrails.example',  organizationId: summit,    createdAt: now() },
    { id: randomUUID(), kind: 'person', name: 'Marcus Hale',  email: 'marcus@blueridge.example',    organizationId: blueRidge, createdAt: now() },
    { id: randomUUID(), kind: 'person', name: 'Priya Sharma', email: 'priya@coastline.example',     organizationId: coastline, createdAt: now() }
  ];

  const salesPipelineId = randomUUID();
  const pipelines: Pipeline[] = [
    {
      id: salesPipelineId,
      name: 'Sales',
      stages: [
        { name: 'New',        kind: 'open' },
        { name: 'Qualified',  kind: 'open' },
        { name: 'Proposal',   kind: 'open' },
        { name: 'Won',        kind: 'won'  },
        { name: 'Lost',       kind: 'lost' }
      ]
    }
  ];

  const opportunities: Opportunity[] = [
    { id: randomUUID(), title: 'Bali honeymoon package',   partyId: summit,    pipelineId: salesPipelineId, stage: 'Proposal',  amount: 9500, closeDate: '2026-07-12', createdAt: now() },
    { id: randomUUID(), title: 'Patagonia trekking trip',  partyId: blueRidge, pipelineId: salesPipelineId, stage: 'Qualified', amount: 6200, closeDate: '2026-09-03', createdAt: now() },
    { id: randomUUID(), title: 'Tokyo + Kyoto custom tour',partyId: coastline, pipelineId: salesPipelineId, stage: 'New',       amount: 4800, closeDate: '2026-12-18', createdAt: now() }
  ];

  const activities: Activity[] = [
    {
      id: randomUUID(),
      type: 'note',
      partyId: summit,
      opportunityId: opportunities[0]!.id,
      body: 'Client prefers overwater villas, allergic to shellfish.',
      at: now(),
      createdAt: now()
    },
    {
      id: randomUUID(),
      type: 'call',
      partyId: blueRidge,
      opportunityId: opportunities[1]!.id,
      body: '15-min discovery call. Wants Patagonia in Q3, group of 1.',
      at: now(),
      createdAt: now()
    }
  ];

  return { parties, pipelines, opportunities, activities };
};

const ensure = (): DB => {
  if (!globalForDB.__crmDB) globalForDB.__crmDB = seed();
  return globalForDB.__crmDB;
};

// ---------- Store API ----------------------------------------------------

export const db = {
  parties: {
    list(filter?: { kind?: PartyKind }): Party[] {
      const all = ensure().parties;
      const filtered = filter?.kind ? all.filter((p) => p.kind === filter.kind) : all;
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    },
    get(id: string): Party | undefined {
      return ensure().parties.find((p) => p.id === id);
    },
    create(input: Omit<Party, 'id' | 'createdAt'>): Party {
      const party: Party = { id: randomUUID(), createdAt: now(), ...input };
      ensure().parties.push(party);
      return party;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.parties.length;
      s.parties = s.parties.filter((p) => p.id !== id);
      // cascade: remove opportunities + activities for this party,
      // unlink persons that worked here.
      const droppedOppIds = new Set(s.opportunities.filter((o) => o.partyId === id).map((o) => o.id));
      s.opportunities = s.opportunities.filter((o) => o.partyId !== id);
      s.activities = s.activities.filter((a) => a.partyId !== id && !(a.opportunityId && droppedOppIds.has(a.opportunityId)));
      s.parties = s.parties.map((p) =>
        p.organizationId === id ? { ...p, organizationId: undefined } : p
      );
      return s.parties.length < before;
    }
  },

  pipelines: {
    list(): Pipeline[] {
      return [...ensure().pipelines];
    },
    get(id: string): Pipeline | undefined {
      return ensure().pipelines.find((p) => p.id === id);
    },
    default(): Pipeline {
      return ensure().pipelines[0]!;
    }
  },

  opportunities: {
    list(): Opportunity[] {
      return [...ensure().opportunities].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
    get(id: string): Opportunity | undefined {
      return ensure().opportunities.find((o) => o.id === id);
    },
    create(input: Omit<Opportunity, 'id' | 'createdAt'>): Opportunity {
      const opp: Opportunity = { id: randomUUID(), createdAt: now(), ...input };
      ensure().opportunities.push(opp);
      return opp;
    },
    setStage(id: string, stage: string): Opportunity | undefined {
      const s = ensure();
      const opp = s.opportunities.find((o) => o.id === id);
      if (!opp) return undefined;
      const previous = opp.stage;
      if (previous === stage) return opp;
      opp.stage = stage;
      // auto-log: visible in both party + opportunity feeds
      s.activities.push({
        id: randomUUID(),
        type: 'log',
        partyId: opp.partyId,
        opportunityId: opp.id,
        body: `Stage moved from "${previous}" to "${stage}"`,
        at: now(),
        createdAt: now()
      });
      return opp;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.opportunities.length;
      s.opportunities = s.opportunities.filter((o) => o.id !== id);
      // cascade: drop activities tied only to this opportunity
      s.activities = s.activities.filter((a) => a.opportunityId !== id);
      return s.opportunities.length < before;
    }
  },

  activities: {
    list(filter?: { partyId?: string; opportunityId?: string }): Activity[] {
      let items = ensure().activities;
      if (filter?.partyId) items = items.filter((a) => a.partyId === filter.partyId);
      if (filter?.opportunityId) items = items.filter((a) => a.opportunityId === filter.opportunityId);
      return [...items].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    },
    create(input: Omit<Activity, 'id' | 'createdAt'>): Activity {
      const activity: Activity = { id: randomUUID(), createdAt: now(), ...input };
      ensure().activities.push(activity);
      return activity;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.activities.length;
      s.activities = s.activities.filter((a) => a.id !== id);
      return s.activities.length < before;
    }
  }
};

// ---------- Helpers ------------------------------------------------------

export const stageKind = (pipeline: Pipeline, stageName: string): StageKind =>
  pipeline.stages.find((s) => s.name === stageName)?.kind ?? 'open';
