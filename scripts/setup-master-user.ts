/**
 * Register the master operator in Supabase Auth so the magic-link login
 * resolves to the seeded `users.id` (and thus to the four memberships
 * provisioned by `npm run db:seed`).
 *
 * Run once after pointing `.env.local` at a real Supabase project:
 *
 *   npm run setup:master
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY     (admin API; never expose to browser)
 *
 * What it does:
 *   1. Looks up the user by email in `auth.users`.
 *   2. If absent → creates the user with the deterministic UUID we seeded.
 *      `email_confirm: true` so the first magic-link send goes through cleanly.
 *      NO password is set — login is magic-link only.
 *   3. If present but ID mismatches → prints a clear error. The fix is to
 *      delete the Supabase auth row (Studio → Authentication → Users) then
 *      re-run. We do NOT silently rewrite IDs because that would orphan any
 *      sessions and audit logs.
 *
 * This script is idempotent — re-running is safe.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { MASTER_OPERATOR_EMAIL, MASTER_OPERATOR_USER_ID } from '../drizzle/seeds/demo-organizations';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing env: ${name}. Set it in .env.local before running this script.`);
  }
  return v;
}

async function main(): Promise<void> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (serviceKey.startsWith('dummy-')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is the placeholder value. Point .env.local at a real Supabase project first.',
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.info(`[setup-master] looking up ${MASTER_OPERATOR_EMAIL} ...`);
  // Paginate auth.users — there's no native "find by email" admin call.
  let existing: { id: string; email: string | undefined } | null = null;
  let page = 1;
  const perPage = 1000;
  // Stop after 10 pages — far more than any demo project should have.
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data.users.find(
      (u) => (u.email ?? '').toLowerCase() === MASTER_OPERATOR_EMAIL.toLowerCase(),
    );
    if (match) {
      existing = { id: match.id, email: match.email };
      break;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  if (existing) {
    if (existing.id === MASTER_OPERATOR_USER_ID) {
      console.info(`[setup-master] OK — auth user already exists with the seeded UUID.`);
      console.info(`[setup-master] next: send a magic link to ${MASTER_OPERATOR_EMAIL} and verify.`);
      return;
    }
    console.error(
      `[setup-master] FAIL — ${MASTER_OPERATOR_EMAIL} exists in Supabase Auth with id=${existing.id}, ` +
        `but the seed expects id=${MASTER_OPERATOR_USER_ID}.`,
    );
    console.error(
      `[setup-master] Fix: open Supabase Studio → Authentication → Users → delete this row, then re-run.`,
    );
    process.exitCode = 1;
    return;
  }

  console.info(`[setup-master] creating auth user with seeded UUID ${MASTER_OPERATOR_USER_ID} ...`);
  const { error: createErr } = await admin.auth.admin.createUser({
    id: MASTER_OPERATOR_USER_ID,
    email: MASTER_OPERATOR_EMAIL,
    email_confirm: true,
    user_metadata: { role: 'master_operator', seeded_by: 'scripts/setup-master-user.ts' },
  });
  if (createErr) {
    throw new Error(`createUser failed: ${createErr.message}`);
  }
  console.info(`[setup-master] done. Next steps:`);
  console.info(`  1) npm run db:push && npm run db:seed   (creates the 4 owner memberships)`);
  console.info(`  2) Open /login → enter ${MASTER_OPERATOR_EMAIL} → check email for magic link`);
  console.info(`  3) After clicking the link you land on /select-org with all 4 orgs visible`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
