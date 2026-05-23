/**
 * Treatment chart approval-flow state machine.
 *
 * Authoritative status transitions for `treatment_charts.status`.
 *
 * Roles:
 *   - hospital: writes drafts, submits, applies "changes_requested" revisions
 *   - agency:   reviews submissions, requests changes, approves, shares to patient
 *   - system:   on finalize (settlement bridge) and on void
 *
 * The flow:
 *
 *      ┌────────┐  submit  ┌──────────┐  start_review  ┌────────────────┐
 *      │ draft  │ ───────► │submitted │ ─────────────► │ agency_review  │
 *      └────────┘          └──────────┘                └────────────────┘
 *                                                       │       │     │
 *                            request_changes  ◄─────────┘       │     │
 *                                  │                  approve   │     │ void
 *                                  ▼                            ▼     │
 *                         ┌────────────────┐            ┌────────────────┐
 *                         │changes_requested│  resubmit │agency_approved │
 *                         └────────────────┘  ─────────►└────────────────┘
 *                                                              │
 *                                                       share  ▼
 *                                                     ┌────────────────┐
 *                                                     │patient_shared  │
 *                                                     └────────────────┘
 *                                                       │           │
 *                                                       │ finalize  │ void
 *                                                       ▼           ▼
 *                                                  ┌───────────┐  ┌──────┐
 *                                                  │ finalized │  │voided│
 *                                                  └───────────┘  └──────┘
 *
 * `finalized` is immutable. The only path forward is to issue a *new* version
 * that supersedes (`supersedesId`).
 */

export type ChartStatus =
  | 'draft'
  | 'submitted'
  | 'agency_review'
  | 'changes_requested'
  | 'agency_approved'
  | 'patient_shared'
  | 'finalized'
  | 'voided';

export type ActorRole = 'hospital' | 'agency' | 'system' | 'ai';

export type ChartTransition =
  | 'submit' // hospital → agency
  | 'start_review' // agency picks it up
  | 'request_changes' // agency → hospital
  | 'resubmit' // hospital after fixes
  | 'approve' // agency approves
  | 'share' // agency shares to patient
  | 'finalize' // system; all signatures in place
  | 'void'; // either side

type TransitionRule = {
  from: ChartStatus;
  to: ChartStatus;
  allowedRoles: ReadonlyArray<ActorRole>;
};

const TRANSITIONS: Record<ChartTransition, TransitionRule> = {
  submit: { from: 'draft', to: 'submitted', allowedRoles: ['hospital'] },
  start_review: { from: 'submitted', to: 'agency_review', allowedRoles: ['agency'] },
  request_changes: {
    from: 'agency_review',
    to: 'changes_requested',
    allowedRoles: ['agency'],
  },
  resubmit: { from: 'changes_requested', to: 'submitted', allowedRoles: ['hospital'] },
  approve: { from: 'agency_review', to: 'agency_approved', allowedRoles: ['agency'] },
  share: { from: 'agency_approved', to: 'patient_shared', allowedRoles: ['agency'] },
  finalize: { from: 'patient_shared', to: 'finalized', allowedRoles: ['system'] },
  // void may originate from any non-terminal status — handled separately.
  void: { from: 'draft', to: 'voided', allowedRoles: ['agency', 'hospital', 'system'] },
};

const VOIDABLE: ReadonlySet<ChartStatus> = new Set([
  'draft',
  'submitted',
  'agency_review',
  'changes_requested',
  'agency_approved',
  'patient_shared',
]);

export type TransitionResult =
  | { ok: true; from: ChartStatus; to: ChartStatus }
  | { ok: false; reason: 'invalid_from' | 'forbidden_role' | 'terminal_state' };

/**
 * Validate and resolve a transition. Returns the new status if allowed, or
 * an explanatory failure reason. Callers persist the change in a transaction
 * and write a `treatment_chart_revisions` row.
 */
export function applyTransition(
  current: ChartStatus,
  transition: ChartTransition,
  actorRole: ActorRole,
): TransitionResult {
  if (current === 'finalized' || current === 'voided') {
    return { ok: false, reason: 'terminal_state' };
  }

  if (transition === 'void') {
    if (!VOIDABLE.has(current)) return { ok: false, reason: 'invalid_from' };
    if (!TRANSITIONS.void.allowedRoles.includes(actorRole)) {
      return { ok: false, reason: 'forbidden_role' };
    }
    return { ok: true, from: current, to: 'voided' };
  }

  const rule = TRANSITIONS[transition];
  if (current !== rule.from) return { ok: false, reason: 'invalid_from' };
  if (!rule.allowedRoles.includes(actorRole)) return { ok: false, reason: 'forbidden_role' };
  return { ok: true, from: current, to: rule.to };
}

/** Which transitions are reachable from `current` for `role`. UI hint. */
export function availableTransitions(
  current: ChartStatus,
  role: ActorRole,
): ChartTransition[] {
  const out: ChartTransition[] = [];
  for (const [t, rule] of Object.entries(TRANSITIONS) as Array<[ChartTransition, TransitionRule]>) {
    if (t === 'void') {
      if (VOIDABLE.has(current) && rule.allowedRoles.includes(role)) out.push(t);
      continue;
    }
    if (current === rule.from && rule.allowedRoles.includes(role)) out.push(t);
  }
  return out;
}

export const FINALIZE_REQUIRED_APPROVAL_ROLES = ['hospital', 'agency', 'patient'] as const;
export type ApprovalRole = (typeof FINALIZE_REQUIRED_APPROVAL_ROLES)[number];

/**
 * Whether all required e-signatures for `finalize` are present.
 * Pass the set of distinct roles that have signed the current chart version.
 */
export function canFinalize(signedRoles: ReadonlySet<ApprovalRole>): boolean {
  return FINALIZE_REQUIRED_APPROVAL_ROLES.every((r) => signedRoles.has(r));
}
