import { NextRequest } from 'next/server';
import { initStore } from '../../../lib/store';
import { search } from '../../../lib/search';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await initStore();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const results = search(q);
  return Response.json({ results });
}
