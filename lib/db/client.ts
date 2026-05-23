import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@/drizzle/schema';
import { expectEnv } from '@/lib/utils/assert';

let _client: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getClient(): ReturnType<typeof postgres> {
  if (_client) return _client;
  const url = process.env.DATABASE_URL ?? expectEnv('DATABASE_URL');
  _client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false, // pgbouncer transaction mode-safe
  });
  return _client;
}

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  _db = drizzle(getClient(), { schema, logger: process.env.LOG_LEVEL === 'debug' });
  return _db;
}

/**
 * Lazy Drizzle proxy. Connecting + env validation only happen on first query —
 * not at module import. This keeps `next build` (which evaluates route modules
 * without DATABASE_URL) from blowing up.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, _receiver) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});

/** Execute raw SQL (used by seeds / migrations). */
export async function dbExec(sqlText: string): Promise<void> {
  await getClient().unsafe(sqlText);
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
  }
}

/**
 * Runs `fn` with the GUCs `app.current_org_id` and `app.current_actor_id`
 * scoped to the local transaction. Mandatory for any request-context query.
 *
 * Postgres RLS reads these via the helpers defined in drizzle/rls/00_setup.sql.
 */
export async function withOrgContext<T>(
  orgId: string,
  actorUserId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_org_id', ${orgId}, true)`);
    if (actorUserId) {
      await tx.execute(sql`SELECT set_config('app.current_actor_id', ${actorUserId}, true)`);
    }
    return await fn();
  });
}
