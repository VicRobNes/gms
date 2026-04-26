# Frontend Starter Structure

This folder initializes the frontend architecture that syncs with the backend contracts.

## Planned stack
- Next.js App Router on Vercel
- Shared API contracts from `src/contracts.ts`
- Server components for dashboard + client components for CRM workflows

## Included stubs
- `src/lib/api-client.ts`: typed fetch wrapper for backend endpoints
- `src/lib/types.ts`: frontend-facing DTO imports and aliases
- `src/pages/dashboard.tsx`: dashboard bootstrap page skeleton
- `src/components/kanban-board.tsx`: lead pipeline board skeleton
