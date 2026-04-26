# Tourism CRM Platform

A Vercel-targeted CRM for tourism marketing agencies. Two deployable apps in one repo: a Hono API in the root and a Next.js dashboard in `frontend/`.

## Highlights

### Backend (`/`)
- Hono API with bearer auth, CORS, and centralized error handling.
- CRUD for contacts, leads, campaigns, trips, tasks, lead notes, team users.
- Dashboard analytics: pipeline value, conversion, marketing CPL/CTR, booked & quoted revenue, overdue tasks.
- Lead↔contact / lead↔trip / lead↔task / lead↔notes lookups.
- Drag-friendly stage helper (`PATCH /api/crm/leads/:id/stage`).
- Vitest test suite covering health, auth, full CRUD lifecycle, and analytics.
- Prisma schema (`prisma/schema.prisma`) ready for PostgreSQL migration.

### Frontend (`/frontend`)
- Next.js 14 App Router with a sticky CRM shell, auth context, and persisted demo session.
- Login screen with one-click seeded demo accounts.
- Dashboard with KPI cards, pipeline-by-stage chart, marketing performance, and upcoming tasks.
- Drag-and-drop **kanban** for leads with detail panel, lead notes timeline, and inline create.
- Contacts list with search, pagination, and create modal.
- Campaigns with metrics editor and channel/status filters.
- Trip requests with book / cancel actions.
- Tasks list with inline status, owner & status filters, scheduled creation.
- Team page with role badges and member invite.
- Plain CSS design system (no build-time CSS dependencies) so the whole app runs with `next build` out of the box.

## Quick start (local)

The Next.js app in `frontend/` mounts the Hono backend as a catch-all
API route, so you only need to run one process for the full product:

```bash
# Run UI + API together on http://localhost:3000
cd frontend
npm install
npm run dev
```

Then sign in with any seeded email:
- `owner@summittrails.example`
- `admin@summittrails.example`
- `agent@summittrails.example`
- `analyst@summittrails.example`

For backend-only iteration (no UI), the standalone Hono server still works:

```bash
npm install
npm test                    # vitest
npm run dev                 # vercel dev (or: npx tsx watch src/index.ts)
```

## Deploy to Vercel

Recommended: a **single Vercel project** that serves both the UI and the API
from the Next.js app in `frontend/`. Hono is mounted as a catch-all API route,
so requests to `/` get the dashboard and `/api/*` go to the same Hono handler
you can run locally.

### Project settings

| Setting              | Value                |
| -------------------- | -------------------- |
| Framework preset     | Next.js              |
| Root Directory       | `frontend`           |
| Build command        | _default_            |
| Install command      | _default_            |
| Output directory     | _default_            |

### Storage

In the Vercel dashboard go to **Storage → Create → KV** and link it to the
project. Vercel injects `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`, etc.
automatically. The Hono store hydrates from KV on cold start and persists the
whole snapshot on every mutation.

Without KV the app still runs, but every cold start re-seeds the demo data
(fine for a quick look, not durable).

### No env coordination needed

Because UI and API share the same origin, you do **not** need to set
`NEXT_PUBLIC_API_BASE_URL` or `CORS_ORIGINS`. The frontend's API client
defaults to same-origin, and CORS only matters when the API is hit from a
different host.

If you ever do split them (backend at root, frontend at `/frontend`) the
standalone `api/[...route].ts` at the repo root still works as a backend-only
Vercel project; in that case set:

- Frontend project: `NEXT_PUBLIC_API_BASE_URL=https://<backend>.vercel.app`
- Backend project: `CORS_ORIGINS=https://<frontend>.vercel.app`

### Reset / persistence notes

- Vercel KV stores the entire CRM as a single JSON snapshot under
  `crm-snapshot` (or `${KV_NAMESPACE}:crm-snapshot`). Easy to swap for Postgres later.
- To start fresh, delete the `crm-snapshot` key in the Vercel KV browser; the
  next request will reseed the demo data.
- To migrate to Postgres, replace `src/lib/store.ts` with Prisma repositories
  (the schema in `prisma/schema.prisma` already matches the in-memory model).

## API surface

```
GET    /api/health
POST   /api/auth/demo-login
GET    /api/auth/me                       (auth)
POST   /api/auth/logout                   (auth)
GET    /api/crm/bootstrap
GET    /api/crm/dashboard
GET    /api/crm/users
POST   /api/crm/users
GET    /api/crm/contacts          ?page&pageSize&search
POST   /api/crm/contacts
GET    /api/crm/contacts/:id
PATCH  /api/crm/contacts/:id
DELETE /api/crm/contacts/:id
GET    /api/crm/contacts/:id/leads
GET    /api/crm/leads             ?page&pageSize&stage&pipeline&assignedTo&search
POST   /api/crm/leads
GET    /api/crm/leads/:id
PATCH  /api/crm/leads/:id
PATCH  /api/crm/leads/:id/stage
DELETE /api/crm/leads/:id
GET    /api/crm/leads/:id/trips
GET    /api/crm/leads/:id/tasks
GET    /api/crm/leads/:id/notes
POST   /api/crm/leads/:id/notes
GET    /api/crm/campaigns         ?status&channel
POST   /api/crm/campaigns
GET    /api/crm/campaigns/:id
PATCH  /api/crm/campaigns/:id/metrics
DELETE /api/crm/campaigns/:id
GET    /api/crm/trips             ?status
POST   /api/crm/trips
GET    /api/crm/trips/:id
PATCH  /api/crm/trips/:id
PATCH  /api/crm/trips/:id/book
PATCH  /api/crm/trips/:id/cancel
DELETE /api/crm/trips/:id
GET    /api/crm/tasks             ?status&ownerId&leadId
POST   /api/crm/tasks
GET    /api/crm/tasks/:id
PATCH  /api/crm/tasks/:id
PATCH  /api/crm/tasks/:id/status
DELETE /api/crm/tasks/:id
```

All `/api/crm/*` routes require `Authorization: Bearer <token>`.

## Stack

- Backend: TypeScript, Hono, Zod, Vitest. Prisma schema for the eventual PostgreSQL move.
- Frontend: TypeScript, Next.js 14 (App Router), React 18, plain CSS.
- CI: GitHub Actions runs both apps' typecheck/build/tests on each push/PR.

## Production roadmap

The remaining hardening work, in order:

1. Replace the in-memory store (`src/lib/store.ts`) with Prisma repositories using the existing schema.
2. Add RBAC checks per route (currently any authenticated user has full access) plus an audit log table.
3. Replace the demo login with a real auth provider (OAuth, magic links, or password + refresh tokens).
4. Background jobs for lead scoring and campaign sync.
5. Real-time websocket updates so kanban changes propagate live.
