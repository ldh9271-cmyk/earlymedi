import 'server-only';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import {
  hospitalDepositPolicies,
  hospitalDoctors,
  hospitalReferralRates,
  hospitals,
  proceduresCatalog,
} from '@/drizzle/schema/hospitals';

export type ListHospitalsFilter = {
  search?: string;
  category?: string;
  onlyActive?: boolean;
};

export async function listHospitals(
  organizationId: string,
  filter: ListHospitalsFilter = {},
  limit = 60,
): Promise<Array<typeof hospitals.$inferSelect & { doctorCount: number }>> {
  const where: SQL[] = [eq(hospitals.organizationId, organizationId)];
  if (filter.onlyActive) where.push(eq(hospitals.isActiveForMatching, true));
  if (filter.search) {
    const term = `%${filter.search}%`;
    const orC = or(ilike(hospitals.name, term), ilike(hospitals.legalName, term));
    if (orC) where.push(orC);
  }
  if (filter.category) {
    where.push(sql`${hospitals.primaryCategories} @> ${JSON.stringify([filter.category])}::jsonb`);
  }

  const rows = await db
    .select({
      hospital: hospitals,
      doctorCount: sql<number>`(SELECT count(*)::int FROM ${hospitalDoctors} hd WHERE hd.hospital_id = ${hospitals.id} AND hd.is_active = true)`,
    })
    .from(hospitals)
    .where(and(...where))
    // sortOrder 우선 → 활성 우선 → 평점 → 등록일.
    // 마스터/에이전시가 sortOrder 로 명시적 노출 순서를 잡을 수 있게.
    .orderBy(
      asc(hospitals.sortOrder),
      desc(hospitals.isActiveForMatching),
      desc(hospitals.rating),
      desc(hospitals.createdAt),
    )
    .limit(limit);

  return rows.map((r) => ({ ...r.hospital, doctorCount: r.doctorCount }));
}

export async function getHospital(
  organizationId: string,
  hospitalId: string,
): Promise<{
  hospital: typeof hospitals.$inferSelect;
  doctors: Array<typeof hospitalDoctors.$inferSelect>;
  referralRates: Array<typeof hospitalReferralRates.$inferSelect>;
  depositPolicy: typeof hospitalDepositPolicies.$inferSelect | null;
} | null> {
  const [hospital] = await db
    .select()
    .from(hospitals)
    .where(and(eq(hospitals.organizationId, organizationId), eq(hospitals.id, hospitalId)))
    .limit(1);
  if (!hospital) return null;
  const [doctors, referralRates, depositPolicyRows] = await Promise.all([
    db.select().from(hospitalDoctors).where(eq(hospitalDoctors.hospitalId, hospitalId)),
    db.select().from(hospitalReferralRates).where(eq(hospitalReferralRates.hospitalId, hospitalId)),
    db
      .select()
      .from(hospitalDepositPolicies)
      .where(eq(hospitalDepositPolicies.hospitalId, hospitalId))
      .limit(1),
  ]);
  return { hospital, doctors, referralRates, depositPolicy: depositPolicyRows[0] ?? null };
}

export async function listProceduresCatalog(
  organizationId: string,
): Promise<Array<typeof proceduresCatalog.$inferSelect>> {
  return await db
    .select()
    .from(proceduresCatalog)
    .where(eq(proceduresCatalog.organizationId, organizationId))
    .orderBy(proceduresCatalog.category, proceduresCatalog.code);
}

export function isOnboardingComplete(
  checklist: typeof hospitals.$inferSelect.onboardingChecklist,
): boolean {
  const required: Array<keyof typeof checklist> = [
    'basics',
    'licenses',
    'referralPolicy',
    'depositPolicy',
    'chartWorkflow',
    'settlementCycle',
    'contractSigned',
  ];
  return required.every((k) => checklist[k] === true);
}
