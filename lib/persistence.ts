// Optional persistence layer. When Vercel KV is provisioned for the project
// (KV_REST_API_URL + KV_REST_API_TOKEN injected by the Storage integration),
// we hydrate the in-memory store from it on cold start and persist after
// every mutation. Without KV the app still works — cold starts just re-seed
// the demo data.

interface KvLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let kvClient: KvLike | null | undefined;

export const hasPersistence = (): boolean =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const KV_KEY = process.env.KV_NAMESPACE
  ? `${process.env.KV_NAMESPACE}:gms-snapshot`
  : 'gms-snapshot';

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

export async function loadSnapshot<T>(): Promise<T | null> {
  const client = await getClient();
  if (!client) return null;
  return (await client.get<T>(KV_KEY)) ?? null;
}

export async function saveSnapshot<T>(snapshot: T): Promise<void> {
  const client = await getClient();
  if (!client) return;
  await client.set(KV_KEY, snapshot);
}

export async function clearSnapshot(): Promise<void> {
  const client = await getClient();
  if (!client) return;
  await client.del(KV_KEY);
}
