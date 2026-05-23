import 'dotenv/config';
import { dbExec, closeDb } from '../lib/db/client';

/**
 * Destructive: drops the entire public schema and recreates it.
 * Use ONLY in development. Production should rely on drizzle migrations.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('reset-db is forbidden in production');
  }
  console.warn('[reset-db] dropping public schema ...');
  await dbExec(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
  `);
  await closeDb();
  console.info('[reset-db] done. now run `npm run db:push && npm run db:seed`');
}

main().catch((err: unknown) => {
  console.error('[reset-db] FAILED', err);
  process.exit(1);
});
