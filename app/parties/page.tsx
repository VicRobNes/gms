import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db, initStore, persistStore, type PartyKind } from '../../lib/store';
import { parseCsv } from '../../lib/csv';

export const dynamic = 'force-dynamic';

interface PartiesPageProps {
  searchParams: { kind?: string; notice?: string };
}

async function createParty(formData: FormData) {
  'use server';
  await initStore();
  const name = String(formData.get('name') ?? '').trim();
  const kind = (String(formData.get('kind') ?? 'person') as PartyKind);
  const email = String(formData.get('email') ?? '').trim() || undefined;
  const phone = String(formData.get('phone') ?? '').trim() || undefined;
  const organizationIdRaw = String(formData.get('organizationId') ?? '').trim();
  const organizationId = kind === 'person' && organizationIdRaw ? organizationIdRaw : undefined;
  if (!name) return;
  db.parties.create({ name, kind, email, phone, organizationId });
  await persistStore();
  revalidatePath('/parties');
  revalidatePath('/');
}

async function importCsv(formData: FormData): Promise<void> {
  'use server';
  await initStore();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    revalidatePath(`/parties?notice=${encodeURIComponent('No file selected.')}`);
    return;
  }
  const text = await file.text();
  let rows: Record<string, string>[] = [];
  try {
    rows = parseCsv(text);
  } catch {
    revalidatePath(`/parties?notice=${encodeURIComponent('Could not parse CSV.')}`);
    return;
  }

  // Two-pass: organizations first, then people (so people can resolve their
  // organizationName to an existing or freshly created org).
  const existing = db.parties.list();
  const orgByName = new Map(
    existing.filter((p) => p.kind === 'organization').map((p) => [p.name.toLowerCase(), p.id])
  );

  let createdOrgs = 0;
  let createdPeople = 0;

  for (const row of rows.filter((r) => (r.kind ?? '').toLowerCase() === 'organization')) {
    const name = (row.name ?? '').trim();
    if (!name) continue;
    if (orgByName.has(name.toLowerCase())) continue;
    const created = db.parties.create({
      kind: 'organization',
      name,
      email: row.email || undefined,
      phone: row.phone || undefined
    });
    orgByName.set(name.toLowerCase(), created.id);
    createdOrgs += 1;
  }

  for (const row of rows.filter((r) => (r.kind ?? '').toLowerCase() === 'person')) {
    const name = (row.name ?? '').trim();
    if (!name) continue;
    let organizationId: string | undefined;
    const orgName = (row.organizationname ?? '').trim();
    if (orgName) {
      organizationId = orgByName.get(orgName.toLowerCase());
      if (!organizationId) {
        const created = db.parties.create({ kind: 'organization', name: orgName });
        orgByName.set(orgName.toLowerCase(), created.id);
        organizationId = created.id;
        createdOrgs += 1;
      }
    }
    db.parties.create({
      kind: 'person',
      name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      organizationId
    });
    createdPeople += 1;
  }

  await persistStore();
  const summary = `Imported ${createdPeople} person${createdPeople === 1 ? '' : 's'} and ${createdOrgs} organization${createdOrgs === 1 ? '' : 's'}.`;
  revalidatePath(`/parties?notice=${encodeURIComponent(summary)}`);
  revalidatePath('/');
}

async function deleteParty(formData: FormData) {
  'use server';
  await initStore();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  db.parties.delete(id);
  await persistStore();
  revalidatePath('/parties');
  revalidatePath('/opportunities');
  revalidatePath('/');
}

export default async function PartiesPage({ searchParams }: PartiesPageProps) {
  await initStore();
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
        <div className="row" style={{ gap: 8 }}>
          <a className="btn" href="/api/parties/export">⬇ Export CSV</a>
          <form action={importCsv} encType="multipart/form-data" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              style={{ fontSize: 12 }}
            />
            <button type="submit" className="btn btn-primary">⬆ Import</button>
          </form>
        </div>
      </div>

      {searchParams.notice && (
        <div className="alert alert-success" style={{ background: '#d3f1e0', color: '#1f7a4f', border: '1px solid rgba(31, 122, 79, 0.2)' }}>
          {searchParams.notice}
        </div>
      )}

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
