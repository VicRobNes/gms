import { initStore, db } from '../../../../lib/store';
import { toCsv } from '../../../../lib/csv';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initStore();
  const parties = db.parties.list();
  const orgById = new Map(
    parties.filter((p) => p.kind === 'organization').map((p) => [p.id, p])
  );
  const rows = parties.map((p) => ({
    kind: p.kind,
    name: p.name,
    email: p.email ?? '',
    phone: p.phone ?? '',
    organizationName: p.organizationId ? orgById.get(p.organizationId)?.name ?? '' : ''
  }));
  const csv = toCsv(rows, ['kind', 'name', 'email', 'phone', 'organizationName']);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="parties-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
