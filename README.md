# Tourism CRM Platform (Backend + Frontend Starter)

A Vercel-targeted CRM foundation for tourism-focused marketing agencies.

## What is now included

### Backend (implemented)
- Authentication bootstrap with bearer sessions
- Contacts, leads, campaigns, trips, and tasks CRUD APIs
- Dashboard analytics snapshot (pipeline, marketing, operations KPIs)
- Filtering and pagination on list endpoints
- Typed validation and centralized error handling
- Prisma schema for production PostgreSQL migration

### Frontend (initial synchronized structure)
- Typed API client consuming backend endpoints
- Shared contract usage (`src/contracts.ts`, `src/types.ts`)
- Dashboard page skeleton wired to CRM APIs
- Lead pipeline kanban component stub

## Stack
- TypeScript
- Hono API (Vercel serverless-compatible)
- Zod validation
- Vitest tests
- Prisma schema (Postgres)

## Run locally

```bash
npm install
npm run build
npm test
vercel dev
```

API root: `http://localhost:3000/api`

## Demo login

```http
POST /api/auth/demo-login
content-type: application/json

{
  "email": "owner@summittrails.example"
}
```

Use `Authorization: Bearer <token>` with `/api/crm/*` routes.

## CRM endpoint summary

- `GET /api/health`
- `POST /api/auth/demo-login`
- `GET /api/crm/bootstrap`
- `GET /api/crm/dashboard`
- Contacts: `GET/POST /api/crm/contacts`, `GET/PATCH/DELETE /api/crm/contacts/:id`
- Leads: `GET/POST /api/crm/leads`, `PATCH /api/crm/leads/:id`
- Campaigns: `GET/POST /api/crm/campaigns`, `PATCH /api/crm/campaigns/:id/metrics`
- Trips: `GET/POST /api/crm/trips`, `PATCH /api/crm/trips/:id`, `PATCH /api/crm/trips/:id/book`
- Tasks: `GET/POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id`, `PATCH /api/crm/tasks/:id/status`, `DELETE /api/crm/tasks/:id`

## Next production steps
1. Replace `src/lib/store.ts` map store with Prisma repositories.
2. Add RBAC policy middleware per route and audit logs.
3. Add background jobs for lead scoring and campaign sync.
4. Add websocket/realtime updates for pipeline boards.
5. Promote frontend stubs into a Next.js app in `frontend/`.
