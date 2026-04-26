import { ApiClient } from '../lib/api-client.js';
import { KanbanBoard } from '../components/kanban-board.js';

interface DashboardPageProps {
  apiBaseUrl: string;
  token: string;
}

export async function DashboardPage({ apiBaseUrl, token }: DashboardPageProps) {
  const api = new ApiClient(apiBaseUrl, token);
  const [snapshot, leads] = await Promise.all([api.dashboard(), api.leads()]);

  return (
    <main>
      <h1>Tourism CRM Dashboard</h1>
      <p>Total leads: {snapshot.pipeline.totalLeads}</p>
      <p>Won leads: {snapshot.pipeline.wonLeads}</p>
      <p>Booked revenue (cents): {snapshot.operations.bookedRevenueCents}</p>
      <KanbanBoard leads={leads.items} />
    </main>
  );
}
