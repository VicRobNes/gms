# Tourism CRM Backend (Vercel)

Backend foundation for a tourism-focused marketing agency CRM platform. This project ships a production-minded API shape with modules for:

- Authentication (demo bootstrap)
- Contacts and lead pipeline management
- Campaign attribution tracking
- Trip quote/book flow
- Task orchestration and KPI dashboard

## Stack

- **Runtime/API**: TypeScript + Hono
- **Hosting target**: Vercel serverless (`vercel.json`)
- **Validation**: Zod
- **Persistence model**: In-memory store for local prototyping + Prisma/Postgres schema for production data layer
- **Tests**: Vitest

## Quick start

```bash
npm install
npm run build
npm test
vercel dev
```

API root: `http://localhost:3000/api`

## Demo auth

Use the seeded demo account to receive a bearer token:

```http
POST /api/auth/demo-login
content-type: application/json

{
  "email": "owner@summittrails.example"
}
```

Then send:

```http
Authorization: Bearer <token>
```

## Core endpoints

- `GET /api/health`
- `POST /api/auth/demo-login`
- `GET /api/crm/dashboard`
- `GET|POST /api/crm/contacts`
- `GET|POST /api/crm/leads`
- `POST /api/crm/campaigns`
- `PATCH /api/crm/campaigns/:id/metrics`
- `POST /api/crm/trips`
- `PATCH /api/crm/trips/:id/book`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/:id/status`

## Productionization checklist

1. Replace `src/lib/store.ts` with Prisma repositories.
2. Implement real auth (NextAuth/Clerk/Auth0 or custom JWT + refresh tokens).
3. Add role-based authorization and audit logs.
4. Add queue/event processing (webhooks, lead scoring, nurture flows).
5. Add observability (OpenTelemetry + structured logs).
6. Add rate limiting and WAF rules.
