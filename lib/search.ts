// Textbook in-memory search: lowercase substring match across the indexed
// fields of each entity, sorted in priority order, capped to a small limit.
// Good enough for thousands of records; swap for a proper index later.

import { db } from './store';

export type SearchKind = 'party' | 'opportunity' | 'task' | 'activity';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const matches = (haystack: string | undefined, needle: string): boolean =>
  !!haystack && haystack.toLowerCase().includes(needle);

export function search(query: string, limit = 12): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const parties = db.parties.list();
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const users = db.users.list();
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const p of parties) {
    if (matches(p.name, q) || matches(p.email, q)) {
      results.push({
        kind: 'party',
        id: p.id,
        title: p.name,
        subtitle: [p.kind, p.email].filter(Boolean).join(' · '),
        href: `/parties/${p.id}`
      });
      if (results.length >= limit) return results;
    }
  }

  for (const o of db.opportunities.list()) {
    const party = partyById.get(o.partyId);
    const owner = o.ownerId ? userById.get(o.ownerId) : undefined;
    if (
      matches(o.title, q) ||
      matches(o.stage, q) ||
      matches(party?.name, q) ||
      matches(owner?.name, q)
    ) {
      results.push({
        kind: 'opportunity',
        id: o.id,
        title: o.title,
        subtitle: [party?.name, o.stage, owner?.name].filter(Boolean).join(' · '),
        href: `/opportunities/${o.id}`
      });
      if (results.length >= limit) return results;
    }
  }

  for (const t of db.tasks.list()) {
    const party = t.partyId ? partyById.get(t.partyId) : undefined;
    const assignee = t.assigneeId ? userById.get(t.assigneeId) : undefined;
    if (matches(t.title, q) || matches(assignee?.name, q) || matches(party?.name, q)) {
      const link = t.opportunityId
        ? `/opportunities/${t.opportunityId}`
        : t.partyId
        ? `/parties/${t.partyId}`
        : '/tasks';
      results.push({
        kind: 'task',
        id: t.id,
        title: t.title,
        subtitle: [
          t.done ? 'done' : 'open',
          party?.name,
          assignee?.name,
          `due ${t.due}`
        ].filter(Boolean).join(' · '),
        href: link
      });
      if (results.length >= limit) return results;
    }
  }

  // Activity body search — last so it doesn't drown out entity matches.
  for (const a of db.activities.list()) {
    if (a.type === 'log') continue;
    if (matches(a.body, q)) {
      const opp = a.opportunityId ? db.opportunities.get(a.opportunityId) : undefined;
      const party = a.partyId ? partyById.get(a.partyId) : undefined;
      const actor = a.actorId ? userById.get(a.actorId) : undefined;
      const href = opp
        ? `/opportunities/${opp.id}`
        : party
        ? `/parties/${party.id}`
        : '/activities';
      const snippet = a.body.length > 80 ? a.body.slice(0, 80) + '…' : a.body;
      results.push({
        kind: 'activity',
        id: a.id,
        title: snippet,
        subtitle: [a.type, actor?.name, party?.name, opp?.title].filter(Boolean).join(' · '),
        href
      });
      if (results.length >= limit) return results;
    }
  }

  return results;
}
