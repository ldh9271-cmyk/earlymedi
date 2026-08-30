import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { caseQuotes } from '@/drizzle/schema/case-quotes';
import { cases } from '@/drizzle/schema/cases';
import { organizations } from '@/drizzle/schema/organizations';
import { partnerContracts } from '@/drizzle/schema/contracts';
import { treatmentCharts } from '@/drizzle/schema/treatment-charts';

/**
 * 의료기관 콘솔 공용 조회.
 *
 * 스코프 규칙 (반드시 withRls 안에서 호출):
 *  - hospitals            RLS hospitals_linked_read — linked_org_id 로 자동 필터
 *  - cases / 차트         RLS (차트 브리지) — 보이는 행만 반환
 *  - partner_contracts    RLS contracts_visible — 상대/자기 계약만
 *  - organizations        org_self_read + org_counterparty_read (계약·RFQ 상대명)
 *  - case_quotes          RLS 미적용 → 여기서 linked hospital id 서브쿼리로
 *                         직접 스코프한다. 이 모듈 밖에서 case_quotes 를
 *                         병원 컨텍스트로 만지지 말 것.
 */

/** 이 병원 조직에 연결된 병원 리스팅 (에이전시 카탈로그의 우리 행들). */
export async function getLinkedHospitals(orgId: string) {
  return db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.linkedOrgId, orgId))
    .orderBy(hospitals.name);
}

export type RfqRow = {
  id: string;
  status: string;
  requestedAt: Date;
  receivedAt: Date | null;
  validUntil: string | null;
  totalKrw: number | null;
  depositKrw: number | null;
  hospitalNotes: string | null;
  hospitalName: string;
  agencyName: string | null;
  /** RLS 차트 브리지가 있으면 케이스 제목이 보인다 — 없으면 null. */
  caseTitle: string | null;
  caseNumber: string | null;
};

/** 우리 병원(들)에 도착한 RFQ 슬롯 전부 — 최신 요청순. */
export async function listRfqs(orgId: string): Promise<RfqRow[]> {
  const linked = db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(eq(hospitals.linkedOrgId, orgId));

  return db
    .select({
      id: caseQuotes.id,
      status: caseQuotes.status,
      requestedAt: caseQuotes.requestedAt,
      receivedAt: caseQuotes.receivedAt,
      validUntil: caseQuotes.validUntil,
      totalKrw: caseQuotes.totalKrw,
      depositKrw: caseQuotes.depositKrw,
      hospitalNotes: caseQuotes.hospitalNotes,
      hospitalName: hospitals.name,
      agencyName: organizations.name,
      caseTitle: cases.title,
      caseNumber: cases.caseNumber,
    })
    .from(caseQuotes)
    .innerJoin(hospitals, eq(hospitals.id, caseQuotes.hospitalId))
    .leftJoin(organizations, eq(organizations.id, caseQuotes.organizationId))
    .leftJoin(cases, eq(cases.id, caseQuotes.caseId))
    .where(inArray(caseQuotes.hospitalId, linked))
    .orderBy(desc(caseQuotes.requestedAt))
    .limit(100);
}

/** RFQ 1건 — 병원 스코프 검증 포함 (없으면 null). */
export async function getRfqForOrg(orgId: string, quoteId: string) {
  const linked = db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(eq(hospitals.linkedOrgId, orgId));
  const [row] = await db
    .select({ id: caseQuotes.id, status: caseQuotes.status })
    .from(caseQuotes)
    .where(and(eq(caseQuotes.id, quoteId), inArray(caseQuotes.hospitalId, linked)))
    .limit(1);
  return row ?? null;
}

/** 차트 브리지로 우리에게 보이는 케이스 + 차트 집계 (환자·캘린더 화면). */
export async function listVisibleCases(orgId: string) {
  return db
    .select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      title: cases.title,
      stage: cases.stage,
      estimatedArrivalDate: cases.estimatedArrivalDate,
      actualArrivalDate: cases.actualArrivalDate,
      estimatedDepartureDate: cases.estimatedDepartureDate,
      lastActivityAt: cases.lastActivityAt,
      agencyName: organizations.name,
      chartCount: sql<number>`count(${treatmentCharts.id})::int`,
      chartTotalKrw: sql<number>`coalesce(sum(${treatmentCharts.grandTotalKrw}), 0)::int`,
    })
    .from(cases)
    .innerJoin(
      treatmentCharts,
      and(eq(treatmentCharts.caseId, cases.id), eq(treatmentCharts.hospitalOrgId, orgId)),
    )
    .leftJoin(organizations, eq(organizations.id, cases.organizationId))
    .groupBy(
      cases.id,
      cases.caseNumber,
      cases.title,
      cases.stage,
      cases.estimatedArrivalDate,
      cases.actualArrivalDate,
      cases.estimatedDepartureDate,
      cases.lastActivityAt,
      organizations.name,
    )
    .orderBy(desc(cases.lastActivityAt))
    .limit(100);
}

/** 우리 병원 차트 전부 (정산·예약금 화면) — 최신 시술일순. */
export async function listHospitalCharts(orgId: string) {
  return db
    .select({
      id: treatmentCharts.id,
      status: treatmentCharts.status,
      /** 케이스를 소유한 유치업체 org — 계약 수수료율 매칭에 쓴다. */
      agencyOrgId: treatmentCharts.organizationId,
      treatmentDate: treatmentCharts.treatmentDate,
      doctorName: treatmentCharts.doctorName,
      grandTotalKrw: treatmentCharts.grandTotalKrw,
      depositReceivedKrw: treatmentCharts.depositReceivedKrw,
      finalizedAt: treatmentCharts.finalizedAt,
    })
    .from(treatmentCharts)
    .where(eq(treatmentCharts.hospitalOrgId, orgId))
    .orderBy(desc(treatmentCharts.treatmentDate))
    .limit(200);
}

/** 우리 병원이 선택(selected)된 견적 — 예약금·캘린더 참고용. */
export async function listSelectedQuotes(orgId: string) {
  const linked = db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(eq(hospitals.linkedOrgId, orgId));
  return db
    .select({
      id: caseQuotes.id,
      totalKrw: caseQuotes.totalKrw,
      depositKrw: caseQuotes.depositKrw,
      requestedAt: caseQuotes.requestedAt,
      receivedAt: caseQuotes.receivedAt,
      hospitalName: hospitals.name,
      agencyName: organizations.name,
      caseTitle: cases.title,
      arrivalDate: cases.estimatedArrivalDate,
    })
    .from(caseQuotes)
    .innerJoin(hospitals, eq(hospitals.id, caseQuotes.hospitalId))
    .leftJoin(organizations, eq(organizations.id, caseQuotes.organizationId))
    .leftJoin(cases, eq(cases.id, caseQuotes.caseId))
    .where(and(inArray(caseQuotes.hospitalId, linked), eq(caseQuotes.status, 'selected')))
    .orderBy(desc(caseQuotes.requestedAt))
    .limit(100);
}

/** 우리 조직이 파트너로 들어간 계약 전부 + 상대 에이전시명. */
export async function listContracts(orgId: string) {
  return db
    .select({
      id: partnerContracts.id,
      agencyOrgId: partnerContracts.agencyOrgId,
      agencyName: organizations.name,
      /** { commissionPct?: number } — 해외 성사 수수료율 (10~30). */
      referralRatePolicyJson: partnerContracts.referralRatePolicyJson,
      isActive: partnerContracts.isActive,
      agencySignedAt: partnerContracts.agencySignedAt,
      partnerSignedAt: partnerContracts.partnerSignedAt,
      effectiveFrom: partnerContracts.effectiveFrom,
      effectiveUntil: partnerContracts.effectiveUntil,
      terminatedAt: partnerContracts.terminatedAt,
      contractPdfUrl: partnerContracts.contractPdfUrl,
      notes: partnerContracts.notes,
      createdAt: partnerContracts.createdAt,
    })
    .from(partnerContracts)
    .leftJoin(organizations, eq(organizations.id, partnerContracts.agencyOrgId))
    .where(eq(partnerContracts.partnerOrgId, orgId))
    .orderBy(desc(partnerContracts.createdAt))
    .limit(100);
}
