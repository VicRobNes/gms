import { revalidatePath } from 'next/cache';
import { store, STAGES, type Stage } from '../../lib/store';
import { StageSelect } from './StageSelect';

export const dynamic = 'force-dynamic';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

async function createDeal(formData: FormData) {
  'use server';
  const title = String(formData.get('title') ?? '').trim();
  const contactId = String(formData.get('contactId') ?? '');
  const amount = Number(formData.get('amount') ?? 0);
  const stage = (String(formData.get('stage') ?? 'new') as Stage);
  const closeDate = String(formData.get('closeDate') ?? '').trim();
  if (!title || !contactId || !closeDate || Number.isNaN(amount)) return;
  store.deals.create({ title, contactId, amount, stage, closeDate });
  revalidatePath('/deals');
  revalidatePath('/');
}

async function updateStage(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const stage = String(formData.get('stage') ?? 'new') as Stage;
  if (!id) return;
  store.deals.setStage(id, stage);
  revalidatePath('/deals');
  revalidatePath('/');
}

async function deleteDeal(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  store.deals.delete(id);
  revalidatePath('/deals');
  revalidatePath('/');
}

export default function DealsPage() {
  const deals = store.deals.list();
  const contacts = store.contacts.list();
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const todayPlus30 = (offset: number) => {
    const d = new Date(Date.now() + offset * 86_400_000);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Deals</h1>
          <p className="subtitle">{deals.length} in pipeline</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">New deal</div>
        {contacts.length === 0 ? (
          <div className="empty">Add a contact first to create a deal.</div>
        ) : (
          <form action={createDeal}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="d-title">Title</label>
                <input id="d-title" className="input" name="title" required />
              </div>
              <div className="field">
                <label htmlFor="d-contact">Contact</label>
                <select id="d-contact" name="contactId" required defaultValue={contacts[0]?.id}>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="d-amount">Amount (USD)</label>
                <input id="d-amount" className="input" type="number" name="amount" min={0} step={100} defaultValue={5000} />
              </div>
              <div className="field">
                <label htmlFor="d-stage">Stage</label>
                <select id="d-stage" name="stage" defaultValue="new">
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="d-close">Close date</label>
                <input id="d-close" className="input" type="date" name="closeDate" defaultValue={todayPlus30(30)} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="submit" className="btn btn-primary">
                Add deal
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Contact</th>
              <th>Amount</th>
              <th>Close</th>
              <th>Stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const contact = contactById.get(d.contactId);
              return (
                <tr key={d.id}>
                  <td><strong>{d.title}</strong></td>
                  <td>{contact?.name ?? <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                  <td>{formatCurrency(d.amount)}</td>
                  <td>{new Date(d.closeDate).toLocaleDateString()}</td>
                  <td>
                    <form action={updateStage}>
                      <input type="hidden" name="id" value={d.id} />
                      <StageSelect defaultValue={d.stage} />
                    </form>
                  </td>
                  <td>
                    <form action={deleteDeal}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="btn btn-ghost btn-danger">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {deals.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No deals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
