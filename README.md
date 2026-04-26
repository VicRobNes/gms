# Tourism CRM Platform

A single Next.js 14 app for tourism marketing agencies. The dashboard runs on
the Next.js App Router; the Hono API is mounted as a catch-all Next.js API
route under `/api/*`. Both ship from one Vercel project with default settings.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with any seeded email:

- `owner@summittrails.example`
- `admin@summittrails.example`
- `agent@summittrails.example`
- `analyst@summittrails.example`

Run the test suite:

```bash
npm test
```

## Layout

```
app/                   Next.js App Router pages + API route
  (crm)/               Authed CRM shell (dashboard, leads, contacts, …)
  api/[...route]/      Next.js catch-all that proxies /api/* to Hono
  login/               Demo login screen
components/            Modal, Badge, …
lib/                   Browser-side ApiClient, auth context, formatters
server/                Hono API + in-memory store + Vercel KV persistence
  index.ts             App entry (CORS + error handling)
  modules/routes.ts    All endpoints
  lib/store.ts         In-memory + KV-backed store
test/                  Vitest end-to-end tests against the Hono app
prisma/                Postgres schema for the eventual ORM migration
```

## Deploy to Vercel

Default settings — point a Vercel project at this repo and deploy. Vercel
auto-detects Next.js, runs `npm install` + `next build`, and serves both UI
and API from the same domain.

To make data survive cold starts: **Storage → Create → KV** in the Vercel
dashboard and link it to the project. Vercel injects `KV_REST_API_URL`,
`KV_REST_API_TOKEN`, and `KV_URL` automatically. Without KV the app still
runs but every cold start re-seeds the demo data.

CORS is open by default (echoes the request origin). Set `CORS_ORIGINS=https://your-domain.com,https://staging.your-domain.com`
to lock the API down to specific origins.

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

## Persistence

- **No KV configured:** in-memory store, seeded on every cold start. Fine for
  a quick demo or local dev.
- **Vercel KV linked:** `server/lib/store.ts` hydrates from a single
  `crm-snapshot` JSON blob on cold start and persists the whole snapshot on
  every successful mutation. Easy to swap for Postgres later (the Prisma
  schema in `prisma/` already matches the in-memory model).

To start fresh, delete the `crm-snapshot` key in the Vercel KV browser; the
next request will reseed the demo data.

## Stack

- Next.js 14 (App Router) + React 18, TypeScript strict
- Hono API + Zod validation, mounted as a Next.js catch-all
- Vitest end-to-end tests
- Vercel KV (optional) for persistence
- Plain CSS design system — no Tailwind / PostCSS
- GitHub Actions runs typecheck + tests + build on each push and PR
