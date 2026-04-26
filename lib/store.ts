// Universal CRM data model — six primitives, three joins.
// Stages 1-3 ship: Party, Pipeline, Opportunity, Activity, Task.
// Stage 4+ will add: User. Same store shape.

const randomUUID = (): string => globalThis.crypto.randomUUID();
const now = (): string => new Date().toISOString();
export const today = (): string => new Date().toISOString().slice(0, 10);
const dateOnly = (offsetDays = 0): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

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

// ---------- Task ---------------------------------------------------------
// Anything that needs to happen. Same join shape as Activity, so a single
// todo surfaces in /tasks, on the linked Party detail, and on the linked
// Opportunity detail.

export interface Task {
  id: string;
  title: string;
  due: string;        // ISO date YYYY-MM-DD
  done: boolean;
  doneAt?: string;
  partyId?: string;
  opportunityId?: string;
  createdAt: string;
}

// ---------- DB -----------------------------------------------------------

interface DB {
  parties: Party[];
  pipelines: Pipeline[];
  opportunities: Opportunity[];
  activities: Activity[];
  tasks: Task[];
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

  const tasks: Task[] = [
    {
      id: randomUUID(),
      title: 'Send Bali itinerary draft',
      due: dateOnly(2),
      done: false,
      partyId: summit,
      opportunityId: opportunities[0]!.id,
      createdAt: now()
    },
    {
      id: randomUUID(),
      title: 'Follow up on Patagonia inquiry',
      due: dateOnly(-1),
      done: false,
      partyId: blueRidge,
      opportunityId: opportunities[1]!.id,
      createdAt: now()
    },
    {
      id: randomUUID(),
      title: 'Prep Tokyo+Kyoto pricing options',
      due: dateOnly(7),
      done: false,
      partyId: coastline,
      opportunityId: opportunities[2]!.id,
      createdAt: now()
    },
    {
      id: randomUUID(),
      title: 'Confirm vendor contracts',
      due: dateOnly(0),
      done: false,
      createdAt: now()
    }
  ];

  return { parties, pipelines, opportunities, activities, tasks };
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
      // cascade: remove opportunities + activities + tasks for this party,
      // unlink persons that worked here.
      const droppedOppIds = new Set(s.opportunities.filter((o) => o.partyId === id).map((o) => o.id));
      s.opportunities = s.opportunities.filter((o) => o.partyId !== id);
      const isOrphaned = (id2: string | undefined) => !!id2 && droppedOppIds.has(id2);
      s.activities = s.activities.filter((a) => a.partyId !== id && !isOrphaned(a.opportunityId));
      s.tasks = s.tasks.filter((t) => t.partyId !== id && !isOrphaned(t.opportunityId));
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
      // cascade: drop activities + tasks tied to this opportunity
      s.activities = s.activities.filter((a) => a.opportunityId !== id);
      s.tasks = s.tasks.filter((t) => t.opportunityId !== id);
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
  },

  tasks: {
    list(filter?: {
      open?: boolean;
      partyId?: string;
      opportunityId?: string;
      dueBefore?: string;
      dueOn?: string;
    }): Task[] {
      let items = ensure().tasks;
      if (filter?.open === true)  items = items.filter((t) => !t.done);
      if (filter?.open === false) items = items.filter((t) => t.done);
      if (filter?.partyId)        items = items.filter((t) => t.partyId === filter.partyId);
      if (filter?.opportunityId)  items = items.filter((t) => t.opportunityId === filter.opportunityId);
      if (filter?.dueBefore)      items = items.filter((t) => t.due < filter.dueBefore!);
      if (filter?.dueOn)          items = items.filter((t) => t.due === filter.dueOn);
      // primary sort: due asc, secondary: createdAt desc (newest task wins ties)
      return [...items].sort((a, b) =>
        a.due === b.due
          ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
          : a.due.localeCompare(b.due)
      );
    },
    get(id: string): Task | undefined {
      return ensure().tasks.find((t) => t.id === id);
    },
    create(input: { title: string; due: string; partyId?: string; opportunityId?: string }): Task {
      const task: Task = {
        id: randomUUID(),
        title: input.title,
        due: input.due,
        done: false,
        partyId: input.partyId,
        opportunityId: input.opportunityId,
        createdAt: now()
      };
      ensure().tasks.push(task);
      return task;
    },
    toggleDone(id: string): Task | undefined {
      const s = ensure();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return undefined;
      t.done = !t.done;
      if (t.done) {
        t.doneAt = now();
        // auto-log: visible in any timeline this task was attached to
        s.activities.push({
          id: randomUUID(),
          type: 'log',
          partyId: t.partyId,
          opportunityId: t.opportunityId,
          body: `Task completed: "${t.title}"`,
          at: now(),
          createdAt: now()
        });
      } else {
        t.doneAt = undefined;
      }
      return t;
    },
    delete(id: string): boolean {
      const s = ensure();
      const before = s.tasks.length;
      s.tasks = s.tasks.filter((t) => t.id !== id);
      return s.tasks.length < before;
    }
  }
};

// ---------- Helpers ------------------------------------------------------

export const stageKind = (pipeline: Pipeline, stageName: string): StageKind =>
  pipeline.stages.find((s) => s.name === stageName)?.kind ?? 'open';
