import 'server-only';

/**
 * Master-account allowlist.
 *
 * Reads `MASTER_EMAILS` from the environment — a comma-separated list of
 * email addresses that are allowed to impersonate any organization on
 * the platform regardless of org_memberships rows.
 *
 *   MASTER_EMAILS=ops-lead@koreaglowup.com,founder@koreaglowup.com
 *
 * The flag is deliberately env-only (not stored in the database) so:
 *   - rotation is a one-line config change in Vercel
 *   - there's a single auditable spot to grep for who has god-mode
 *   - DB dumps + leaks don't expose the allowlist
 *
 * Comparison is case-insensitive and trims whitespace per entry. Empty
 * env (the typical state in local dev) returns `false` for every input.
 */
const MASTERS: ReadonlySet<string> = (() => {
  const raw = process.env.MASTER_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
})();

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return MASTERS.has(email.toLowerCase());
}

/** Useful for surfacing the configured count in /select-org banners. */
export function masterAllowlistSize(): number {
  return MASTERS.size;
}
