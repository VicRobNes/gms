# GMS CRM

A minimal CRM built with Next.js 14 (App Router) — sidebar layout, dashboard,
contacts, and deals. Single page app at the repo root, ready to deploy on
Vercel with default settings.

## Features

- **Dashboard** — KPI cards (open pipeline, won revenue, conversion, contacts),
  pipeline-by-stage chart, "closing soon" list.
- **Contacts** — list with create/delete via Server Actions.
- **Deals** — list with inline stage updates, create form, delete.
- **In-memory store** seeded on first request; lost on cold start (good for a
  demo, easy to swap for a database later).

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy

Push to GitHub. Connect the repo to a Vercel project. Vercel auto-detects
Next.js and serves the app from `/` with no extra configuration.

## Layout

```
app/
  layout.tsx        Sidebar shell + global nav
  page.tsx          Dashboard
  globals.css       Plain CSS design system
  contacts/         Contacts page (Server Actions)
  deals/            Deals page (Server Actions + StageSelect client)
  api/health/       /api/health JSON endpoint
lib/store.ts        In-memory store, seeded on first use
```
