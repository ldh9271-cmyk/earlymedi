import 'server-only';
import { withOrgContext } from '@/lib/db/client';
import type { RouteContext } from './route-guards';

/**
 * Helper that runs a query function inside the active org's RLS context.
 * Use this in every server-side data fetcher; never call `db.select(...)`
 * directly from a route handler without it (RLS will reject).
 *
 * Usage:
 *   const data = await withRls(ctx, () =>
 *     db.select().from(patients).where(eq(patients.organizationId, ctx.orgId))
 *   );
 */
export async function withRls<T>(ctx: RouteContext, fn: () => Promise<T>): Promise<T> {
  return await withOrgContext(ctx.orgId, ctx.userId, fn);
}
