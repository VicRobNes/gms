import app from '../../../server/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = (req: Request) => app.fetch(req);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD
};
