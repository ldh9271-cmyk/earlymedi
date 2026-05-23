/**
 * Edge-safe constants for the active-org cookie/header.
 *
 * Lives separately from `active-org.ts` because the middleware runs in Edge
 * runtime and cannot pull in the Drizzle/postgres-js stack. The middleware
 * imports only these constants; route handlers and server components import
 * the full `active-org.ts` (with DB helpers).
 */
export const ACTIVE_ORG_COOKIE = 'em.active_org';
export const ACTIVE_ORG_HEADER = 'x-em-active-org';
