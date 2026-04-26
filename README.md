# GMS CRM

A textbook CRM that ships from one Next.js 14 app on Vercel. Universal data
model, no fanciness — just the six entities every CRM is built on, joined
the three ways every CRM joins them.

```
Party    1—N  Opportunity    1—N  Activity / Task
              (also linked direct to Party)
User     1—N  everything (owner / assignee / actor)
```

## What's in

| Page                         | What it does |
| ---------------------------- | ------------ |
| `/` Dashboard                | Personal KPIs (open pipeline, my tasks, conversion), pipeline-by-stage chart, your "up next" tasks, opportunities closing soon. |
| `/parties[?kind=]`           | People + organizations in one table. Inline create with kind / email / phone / works-at. CSV import + export. |
| `/parties/[id]`              | Reach-out buttons (mailto / tel), inline edit, related opportunities, members (for orgs), tasks card, activity timeline. |
| `/opportunities`             | Table or kanban view. Mine filter, pipeline filter chips. Inline stage move via dropdown or drag-and-drop. |
| `/opportunities/[id]`        | Reach-out buttons (via party), edit details, snapshot card, stage mover, owner reassign, tasks, activity timeline. |
| `/tasks`                     | Open / Today / Overdue / Upcoming / Done filter chips + Mine toggle. Inline complete + reassign. |
| `/activities`                | Global activity feed with type chips and per-user filter. |
| `/pipelines`                 | Manage pipelines (rename, add/remove/reorder stages, set per-stage kind). Templates: Sales / Campaign Delivery / Onboarding. |
| `/reports`                   | Owner leaderboard, pipeline funnels, won-revenue by month, activity volume per user. |
| `Cmd/Ctrl + K`               | Global jump-to: search across parties, opportunities, tasks, activity bodies. |

## Run

```
npm install
npm run dev    # http://localhost:3000
```

Sign in by picking a user from the sidebar (Sasha, Taylor, or Morgan are
seeded by default).

## Deploy

Connect the repo to Vercel — defaults work. For data that survives cold
starts, add **Vercel KV** in the project's Storage tab (`KV_REST_API_URL` +
`KV_REST_API_TOKEN` get auto-injected). Without KV the app still runs;
every cold start re-seeds the demo data.

Optional env:

```
CORS_ORIGINS=https://your-domain.com    # not used yet, reserved for future API
KV_NAMESPACE=production                 # snapshot key prefix when using KV
```

## Architecture

```
app/                Next.js App Router pages + API routes
  api/health         /api/health        — JSON liveness check
  api/search         /api/search?q=…    — global search backing Cmd-K
  api/parties/export /api/parties/...   — CSV download
components/         Shared server + client components
  Timeline.tsx       Activity feed
  TaskList.tsx       Task table with inline complete + delete
  CommandPalette.tsx Cmd/Ctrl-K palette (client)
  UserSwitch.tsx     Sidebar user dropdown (client)
lib/
  store.ts           Universal CRM model + in-memory store + initStore + persistStore
  auth.ts            Cookie-based current user
  persistence.ts     Optional Vercel KV layer (lazy import, no-ops if KV absent)
  search.ts          Pure substring search across the model
  csv.ts             RFC-4180-ish CSV reader/writer (no deps)
```

The store keeps **all reads synchronous** after a one-time async hydration
on cold start. Every Server Action awaits `initStore()` first and
`persistStore()` last; reads on pages just await `initStore()` once at the
top. That's it for the persistence boundary.

## Data model

| Entity         | Fields |
| -------------- | ------ |
| `User`         | id, name, email, role |
| `Party`        | id, kind (`person`/`organization`), name, email?, phone?, organizationId? |
| `Pipeline`     | id, name, stages[]: { name, kind: `open`/`won`/`lost` } |
| `Opportunity`  | id, title, partyId, pipelineId, stage, amount, closeDate, ownerId? |
| `Activity`     | id, type (`note`/`call`/`email`/`meeting`/`log`), partyId?, opportunityId?, actorId?, body, at |
| `Task`         | id, title, due, done, doneAt?, partyId?, opportunityId?, assigneeId? |

A single write of an Activity or Task surfaces on the linked Party detail
**and** the linked Opportunity detail. Stage moves, owner changes, task
completions all auto-emit a `log` Activity, so the timeline is the source of
truth for what happened and who did it.
