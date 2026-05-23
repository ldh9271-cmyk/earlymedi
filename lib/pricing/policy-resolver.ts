/**
 * Policy-priority resolver.
 *
 * Multiple price/fee policies can apply to one chart line:
 *   - per-procedure override (most specific)
 *   - per-category default
 *   - hospital-wide default (fallback)
 *
 * For commissions there's an additional axis:
 *   - per-case override > per-freelancer > per-category > organization-default
 *
 * The resolver picks the most-specific policy that matches and returns it,
 * along with the level at which it matched (for audit + UI hints).
 */

export type ResolveLevel = 'case' | 'individual' | 'procedure' | 'category' | 'organization';

export type ResolverInput<P> = {
  /** Per-case override; nullable. Highest precedence when present. */
  case?: P | null;
  /** Per-individual (freelancer / payee) policy; nullable. */
  individual?: P | null;
  /** Per-procedure override; nullable. Used by hospital-fee resolution. */
  procedure?: P | null;
  /** Per-category default; nullable. */
  category?: P | null;
  /** Organization-wide default. Should always be supplied as the fallback. */
  organization: P;
};

export type ResolveResult<P> = {
  policy: P;
  level: ResolveLevel;
};

/**
 * Resolve in commission order: case > individual > category > organization.
 * `procedure` is ignored here — use `resolveFeePolicy` for hospital fees.
 */
export function resolveCommissionPolicy<P>(input: ResolverInput<P>): ResolveResult<P> {
  if (input.case) return { policy: input.case, level: 'case' };
  if (input.individual) return { policy: input.individual, level: 'individual' };
  if (input.category) return { policy: input.category, level: 'category' };
  return { policy: input.organization, level: 'organization' };
}

/**
 * Resolve in hospital-fee order: procedure > category > organization (hospital default).
 * No case or individual axis — fees are negotiated per hospital, not per case.
 */
export function resolveFeePolicy<P>(input: {
  procedure?: P | null;
  category?: P | null;
  organization: P;
}): ResolveResult<P> {
  if (input.procedure) return { policy: input.procedure, level: 'procedure' };
  if (input.category) return { policy: input.category, level: 'category' };
  return { policy: input.organization, level: 'organization' };
}

/**
 * Freeze the resolution result onto a case at creation/quote time so
 * subsequent edits to the hospital's policy do NOT retroactively change the
 * commission/fee owed. The case stores `policy_snapshot_json` and every
 * downstream calculation reads from that snapshot, not the live policy.
 */
export function snapshotPolicy<P>(resolved: ResolveResult<P>, snapshotAt: Date = new Date()): {
  policy: P;
  level: ResolveLevel;
  snapshotAt: string;
} {
  return { policy: resolved.policy, level: resolved.level, snapshotAt: snapshotAt.toISOString() };
}
