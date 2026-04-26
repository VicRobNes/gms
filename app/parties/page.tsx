import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db, type PartyKind } from '../../lib/store';

export const dynamic = 'force-dynamic';

interface PartiesPageProps {
  searchParams: { kind?: string };
}

async function createParty(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '').trim();
  const kind = (String(formData.get('kind') ?? 'person') as PartyKind);
  const email = String(formData.get('email') ?? '').trim() || undefined;
  const phone = String(formData.get('phone') ?? '').trim() || undefined;
  const organizationIdRaw = String(formData.get('organizationId') ?? '').trim();
  const organizationId = kind === 'person' && organizationIdRaw ? organizationIdRaw : undefined;
  if (!name) return;
  db.parties.create({ name, kind, email, phone, organizationId });
  revalidatePath('/parties');
  revalidatePath('/');
}

async function deleteParty(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  db.parties.delete(id);
  revalidatePath('/parties');
  revalidatePath('/opportunities');
  revalidatePath('/');
}

export default function PartiesPage({ searchParams }: PartiesPageProps) {
  const kindFilter = searchParams.kind === 'person' || searchParams.kind === 'organization'
    ? (searchParams.kind as PartyKind)
    : undefined;

  const parties = db.parties.list({ kind: kindFilter });
  const allOrgs = db.parties.list({ kind: 'organization' });
  const orgById = new Map(allOrgs.map((o) => [o.id, o]));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parties</h1>
          <p className="subtitle">{parties.length} {kindFilter ? kindFilter + 's' : 'records'} (people + organizations)</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <a href="/parties" className={`btn ${!kindFilter ? 'btn-primary' : ''}`}>All</a>
        <a href="/parties?kind=person" className={`btn ${kindFilter === 'person' ? 'btn-primary' : ''}`}>People</a>
        <a href="/parties?kind=organization" className={`btn ${kindFilter === 'organization' ? 'btn-primary' : ''}`}>Organizations</a>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New party</div>
        <form action={createParty}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-kind">Kind</label>
              <select id="p-kind" name="kind" defaultValue="person">
                <option value="person">Person</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" className="input" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="p-email">Email</label>
              <input id="p-email" className="input" type="email" name="email" />
            </div>
            <div className="field">
              <label htmlFor="p-phone">Phone</label>
              <input id="p-phone" className="input" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="p-org">Works at (people only)</label>
              <select id="p-org" name="organizationId" defaultValue="">
                <option value="">— none —</option>
                {allOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary">Add party</button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Email</th>
              <th>Works at</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parties.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/parties/${p.id}`} className="link"><strong>{p.name}</strong></Link></td>
                <td><span className="badge">{p.kind}</span></td>
                <td>{p.email ?? '—'}</td>
                <td>{p.organizationId ? (
                  <Link href={`/parties/${p.organizationId}`} className="link">
                    {orgById.get(p.organizationId)?.name ?? '—'}
                  </Link>
                ) : '—'}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <form action={deleteParty}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="btn btn-ghost btn-danger">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {parties.length === 0 && (
              <tr><td colSpan={6} className="empty">No parties yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
