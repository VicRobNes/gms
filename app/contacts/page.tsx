import { revalidatePath } from 'next/cache';
import { store } from '../../lib/store';

export const dynamic = 'force-dynamic';

async function createContact(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();
  if (!name || !email) return;
  store.contacts.create({ name, email, company });
  revalidatePath('/contacts');
  revalidatePath('/');
}

async function deleteContact(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  store.contacts.delete(id);
  revalidatePath('/contacts');
  revalidatePath('/');
  revalidatePath('/deals');
}

export default function ContactsPage() {
  const contacts = store.contacts.list();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p className="subtitle">{contacts.length} total</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New contact</div>
        <form action={createContact}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" className="input" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" className="input" type="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="c-company">Company</label>
              <input id="c-company" className="input" name="company" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary">
              Add contact
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.email}</td>
                <td>{c.company || '—'}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  <form action={deleteContact}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn btn-ghost btn-danger">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
