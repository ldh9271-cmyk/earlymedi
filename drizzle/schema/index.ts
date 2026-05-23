/**
 * Drizzle schema index — barrel re-exporting every schema file.
 *
 * Phase 1 ships: organizations, users, memberships, affiliations, contracts,
 * invites, billing (plans + accounts), audit. Later phases append modules
 * (patients, cases, hospitals, charts, payments, …) without touching existing
 * tables.
 */

export * from './enums';
export * from './organizations';
export * from './users';
export * from './memberships';
export * from './affiliations';
export * from './contracts';
export * from './invites';
export * from './billing';
export * from './audit';

// Phase 2 — messaging
export * from './messaging-enums';
export * from './channels';
export * from './conversations';
export * from './messages';

// Phase 3 — AI
export * from './ai';

// Phase 4 — clinical (patients, hospitals, procedures, treatment charts)
export * from './clinical-enums';
export * from './patients';
export * from './hospitals';
export * from './treatment-charts';

// Phase 5 — case lifecycle
export * from './case-enums';
export * from './cases';

// Phase 7 — visa
export * from './visa';

// Phase 8 — aftercare
export * from './recovery-enums';
export * from './recovery';
