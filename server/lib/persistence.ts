import type {
  AuthSession,
  Campaign,
  Contact,
  Lead,
  LeadNote,
  Organization,
  Task,
  TripRequest,
  User
} from '../types.js';

export interface StoreSnapshot {
  organizations: Organization[];
  users: User[];
  contacts: Contact[];
  leads: Lead[];
  campaigns: Campaign[];
  trips: TripRequest[];
  tasks: Task[];
  leadNotes: LeadNote[];
  sessions: AuthSession[];
}

interface KvLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}

let kvClient: KvLike | null | undefined;

export const hasPersistence = (): boolean =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const KV_KEY = process.env.KV_NAMESPACE
  ? `${process.env.KV_NAMESPACE}:crm-snapshot`
  : 'crm-snapshot';

async function getClient(): Promise<KvLike | null> {
  if (kvClient !== undefined) return kvClient;
  if (!hasPersistence()) {
    kvClient = null;
    return null;
  }
  try {
    const mod = (await import('@vercel/kv')) as { kv: KvLike };
    kvClient = mod.kv;
    return kvClient;
  } catch (err) {
    console.error('[persistence] @vercel/kv not available, persistence disabled', err);
    kvClient = null;
    return null;
  }
}

export async function loadSnapshot(): Promise<StoreSnapshot | null> {
  const client = await getClient();
  if (!client) return null;
  return (await client.get<StoreSnapshot>(KV_KEY)) ?? null;
}

export async function saveSnapshot(snapshot: StoreSnapshot): Promise<void> {
  const client = await getClient();
  if (!client) return;
  await client.set(KV_KEY, snapshot);
}
