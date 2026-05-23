import { relations } from 'drizzle-orm';
import { organizations } from './schema/organizations';
import { users } from './schema/users';
import { orgMemberships } from './schema/memberships';
import { freelancerAffiliations } from './schema/affiliations';
import { partnerContracts } from './schema/contracts';
import { invites } from './schema/invites';
import { billingAccounts, billingPlans } from './schema/billing';
import { auditLogs } from './schema/audit';

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  memberships: many(orgMemberships),
  invites: many(invites),
  billingAccount: one(billingAccounts, {
    fields: [organizations.id],
    references: [billingAccounts.organizationId],
  }),
  // M:N — both sides
  affiliationsAsAgency: many(freelancerAffiliations, { relationName: 'agency' }),
  affiliationsAsFreelancer: many(freelancerAffiliations, { relationName: 'freelancer' }),
  partnerContractsAsAgency: many(partnerContracts, { relationName: 'agency' }),
  partnerContractsAsPartner: many(partnerContracts, { relationName: 'partner' }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMemberships),
}));

export const orgMembershipsRelations = relations(orgMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [orgMemberships.userId], references: [users.id] }),
  invitedBy: one(users, {
    fields: [orgMemberships.invitedById],
    references: [users.id],
  }),
}));

export const freelancerAffiliationsRelations = relations(freelancerAffiliations, ({ one }) => ({
  agency: one(organizations, {
    fields: [freelancerAffiliations.agencyOrgId],
    references: [organizations.id],
    relationName: 'agency',
  }),
  freelancer: one(organizations, {
    fields: [freelancerAffiliations.freelancerOrgId],
    references: [organizations.id],
    relationName: 'freelancer',
  }),
}));

export const partnerContractsRelations = relations(partnerContracts, ({ one }) => ({
  agency: one(organizations, {
    fields: [partnerContracts.agencyOrgId],
    references: [organizations.id],
    relationName: 'agency',
  }),
  partner: one(organizations, {
    fields: [partnerContracts.partnerOrgId],
    references: [organizations.id],
    relationName: 'partner',
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invitedByUserId],
    references: [users.id],
  }),
  acceptedBy: one(users, {
    fields: [invites.acceptedByUserId],
    references: [users.id],
  }),
}));

export const billingAccountsRelations = relations(billingAccounts, ({ one }) => ({
  organization: one(organizations, {
    fields: [billingAccounts.organizationId],
    references: [organizations.id],
  }),
  plan: one(billingPlans, {
    fields: [billingAccounts.planId],
    references: [billingPlans.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));
