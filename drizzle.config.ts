import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

// Load .env.local first (Next.js convention for local secrets), then fall
// back to .env. drizzle-kit runs outside Next, so we must do this manually.
loadEnv({ path: '.env.local' });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required in environment.');
}

export default {
  schema: './drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
} satisfies Config;
