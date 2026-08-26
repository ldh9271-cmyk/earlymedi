import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { cases } from '@/drizzle/schema/cases';
import { caseQuotes } from '@/drizzle/schema/case-quotes';
import { hospitals } from '@/drizzle/schema/hospitals';
import { patients } from '@/drizzle/schema/patients';
import { auditLogs } from '@/drizzle/schema/audit';
import { addCaseEvent, transitionStage } from './cases';

/**
 * RFQ · 견적 워크스페이스 저장소 (/agency/quotes).
 *
 * case_quotes 가 "현재 상태" 테이블이고, 모든 변경은 케이스 타임라인
 * (case_events rfq_sent / quote_received / quote_accepted /
 * quote_rejected)에도 함께 기록된다. 케이스 스테이지는 견적 진행에 맞춰
 * 앞으로만 민다 — scoping → rfq_sent → quoted → accepted. 이미 더
 * 앞선(뒤 단계) 케이스는 건드리지 않는다.
 */

export type QuoteStatus = 'requested' | 'received' | 'selected' | 'rejected' | 'expired';

export type QuoteRow = {
  id: string;
  caseId: string;
  hospitalId: string;
  hospitalName: string;
  status: QuoteStatus;
  requestedAt: Date;
  receivedAt: Date | null;
  validUntil: string | null;
  totalKrw: number | null;
  depositKrw: number | null;
  lineItems: Array<{ name: string; amountKrw: number }>;
  hospitalNotes: string | null;
  internalMemo: string | null;
};

export type QuoteCaseRow = {
  id: string;
  caseNumber: string;
  title: string;
  stage: string;
  patientId: string;
  patientName: string;
  targetProcedureCategories: string[];
  estimatedArrivalDate: string | null;
  lastActivityAt: Date;
  quotes: QuoteRow[];
};

/** 견적 파이프라인에 표시할 스테이지 — 수락 이후(입금~정산)는 케이스 보드 몫. */
const PIPELINE_STAGES = ['scoping', 'rfq_sent', 'quoted', 'accepted'] as const;

export async function listQuoteWorkspace(organizationId: string): Promise<{
  cases: QuoteCaseRow[];
  hospitalOptions: Array<{ id: string; name: string }>;
}> {
  const caseRows = await db
    .select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      title: cases.title,
      stage: cases.stage,
      patientId: cases.patientId,
      patientName: patients.fullName,
      targetProcedureCategories: cases.targetProcedureCategoriesJson,
      estimatedArrivalDate: cases.estimatedArrivalDate,
      lastActivityAt: cases.lastActivityAt,
    })
    .from(cases)
    .innerJoin(patients, eq(cases.patientId, patients.id))
    .where(
      and(
        eq(cases.organizationId, organizationId),
        inArray(cases.stage, [...PIPELINE_STAGES]),
      ),
    )
    .orderBy(desc(cases.lastActivityAt))
    .limit(100);

  const caseIds = caseRows.map((c) => c.id);
  const quoteRows = caseIds.length
    ? await db
        .select({
          id: caseQuotes.id,
          caseId: caseQuotes.caseId,
          hospitalId: caseQuotes.hospitalId,
          hospitalName: hospitals.name,
          status: caseQuotes.status,
          requestedAt: caseQuotes.requestedAt,
          receivedAt: caseQuotes.receivedAt,
          validUntil: caseQuotes.validUntil,
          totalKrw: caseQuotes.totalKrw,
          depositKrw: caseQuotes.depositKrw,
          lineItems: caseQuotes.lineItemsJson,
          hospitalNotes: caseQuotes.hospitalNotes,
          internalMemo: caseQuotes.internalMemo,
        })
        .from(caseQuotes)
        .innerJoin(hospitals, eq(caseQuotes.hospitalId, hospitals.id))
        .where(
          and(
            eq(caseQuotes.organizationId, organizationId),
            inArray(caseQuotes.caseId, caseIds),
          ),
        )
        .orderBy(desc(caseQuotes.requestedAt))
    : [];

  const byCase = new Map<string, QuoteRow[]>();
  for (const q of quoteRows) {
    const list = byCase.get(q.caseId) ?? [];
    list.push({ ...q, status: q.status as QuoteStatus });
    byCase.set(q.caseId, list);
  }

  const hospitalOptions = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.organizationId, organizationId))
    .orderBy(hospitals.name);

  return {
    cases: caseRows.map((c) => ({
      ...c,
      quotes: byCase.get(c.id) ?? [],
    })),
    hospitalOptions,
  };
}

/**
 * RFQ 발송 기록 — 선택한 병원마다 case_quotes 슬롯을 만들고(있으면
 * 재요청으로 되살림), 케이스 대상 병원 목록을 합집합으로 갱신한 뒤
 * rfq_sent 이벤트 + 스테이지 전진(scoping → rfq_sent)까지 처리한다.
 */
export async function sendRfq(
  organizationId: string,
  actorUserId: string | null,
  caseId: string,
  hospitalIds: string[],
): Promise<{ created: number }> {
  const [c] = await db
    .select({ stage: cases.stage, targetHospitalIds: cases.targetHospitalIdsJson })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)))
    .limit(1);
  if (!c) throw new Error('case_not_found');

  const hospitalRows = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(
      and(eq(hospitals.organizationId, organizationId), inArray(hospitals.id, hospitalIds)),
    );
  if (hospitalRows.length === 0) throw new Error('no_valid_hospitals');

  let created = 0;
  for (const h of hospitalRows) {
    const [row] = await db
      .insert(caseQuotes)
      .values({
        organizationId,
        caseId,
        hospitalId: h.id,
        status: 'requested',
        createdByUserId: actorUserId,
      })
      .onConflictDoUpdate({
        target: [caseQuotes.caseId, caseQuotes.hospitalId],
        // 재발송: 탈락/만료 슬롯을 다시 요청 상태로 되살린다. 이미
        // received/selected 인 슬롯도 요청 시각만 갱신하면 곤란하므로
        // status 는 requested 로 되돌리지 않고 그대로 두는 게 맞지만,
        // 운영 단순화를 위해 rejected/expired 만 되살린다.
        set: {
          status: sql`CASE WHEN ${caseQuotes.status} IN ('rejected','expired') THEN 'requested' ELSE ${caseQuotes.status} END`,
          requestedAt: sql`CASE WHEN ${caseQuotes.status} IN ('rejected','expired') THEN now() ELSE ${caseQuotes.requestedAt} END`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: caseQuotes.id });
    if (row) created += 1;
  }

  // 대상 병원 합집합 갱신
  const union = Array.from(new Set([...(c.targetHospitalIds ?? []), ...hospitalRows.map((h) => h.id)]));
  await db
    .update(cases)
    .set({ targetHospitalIdsJson: union, updatedAt: new Date() })
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, caseId)));

  await addCaseEvent(organizationId, caseId, {
    eventType: 'rfq_sent',
    actorRole: 'agency',
    actorUserId,
    title: `RFQ 발송 — ${hospitalRows.length}개 병원`,
    description: hospitalRows.map((h) => h.name).join(', '),
    payload: { hospitalIds: hospitalRows.map((h) => h.id) },
  });

  if (c.stage === 'scoping') {
    await transitionStage(organizationId, actorUserId, caseId, 'rfq_sent', 'RFQ 발송');
  }

  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: 'create',
    entityType: 'case_quote',
    entityId: caseId,
    diff: { op: 'rfq_sent', hospitalIds: hospitalRows.map((h) => h.id) },
  });

  return { created };
}

export type RecordQuoteInput = {
  quoteId: string;
  totalKrw: number;
  depositKrw?: number | null;
  validUntil?: string | null; // YYYY-MM-DD
  lineItems?: Array<{ name: string; amountKrw: number }>;
  hospitalNotes?: string | null;
  internalMemo?: string | null;
};

/** 병원 견적 응답 기록 — 슬롯을 received 로 채우고 이벤트/스테이지 갱신. */
export async function recordQuote(
  organizationId: string,
  actorUserId: string | null,
  input: RecordQuoteInput,
): Promise<void> {
  const [q] = await db
    .select({
      id: caseQuotes.id,
      caseId: caseQuotes.caseId,
      hospitalId: caseQuotes.hospitalId,
      status: caseQuotes.status,
    })
    .from(caseQuotes)
    .where(
      and(eq(caseQuotes.organizationId, organizationId), eq(caseQuotes.id, input.quoteId)),
    )
    .limit(1);
  if (!q) throw new Error('quote_not_found');
  if (q.status === 'selected') throw new Error('quote_already_selected');

  const [hospital] = await db
    .select({ name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.id, q.hospitalId))
    .limit(1);

  await db
    .update(caseQuotes)
    .set({
      status: 'received',
      receivedAt: new Date(),
      totalKrw: input.totalKrw,
      depositKrw: input.depositKrw ?? null,
      validUntil: input.validUntil ?? null,
      ...(input.lineItems ? { lineItemsJson: input.lineItems } : {}),
      hospitalNotes: input.hospitalNotes ?? null,
      internalMemo: input.internalMemo ?? null,
      updatedAt: new Date(),
    })
    .where(eq(caseQuotes.id, q.id));

  await addCaseEvent(organizationId, q.caseId, {
    eventType: 'quote_received',
    actorRole: 'hospital',
    actorUserId,
    title: `견적 수신 — ${hospital?.name ?? '병원'}`,
    description: `₩${input.totalKrw.toLocaleString('ko-KR')}${input.validUntil ? ` · ${input.validUntil} 까지 유효` : ''}`,
    relatedEntityType: 'case_quote',
    relatedEntityId: q.id,
    payload: { totalKrw: input.totalKrw, validUntil: input.validUntil ?? null },
  });

  const [c] = await db
    .select({ stage: cases.stage })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, q.caseId)))
    .limit(1);
  if (c && (c.stage === 'scoping' || c.stage === 'rfq_sent')) {
    await transitionStage(organizationId, actorUserId, q.caseId, 'quoted', '견적 수신');
  }
}

/**
 * 견적 수락 — 해당 슬롯 selected, 같은 케이스의 나머지 미결 슬롯
 * (requested/received) rejected, 케이스 예상 총액 갱신 + accepted 전진.
 */
export async function acceptQuote(
  organizationId: string,
  actorUserId: string | null,
  quoteId: string,
): Promise<void> {
  const [q] = await db
    .select({
      id: caseQuotes.id,
      caseId: caseQuotes.caseId,
      hospitalId: caseQuotes.hospitalId,
      status: caseQuotes.status,
      totalKrw: caseQuotes.totalKrw,
    })
    .from(caseQuotes)
    .where(and(eq(caseQuotes.organizationId, organizationId), eq(caseQuotes.id, quoteId)))
    .limit(1);
  if (!q) throw new Error('quote_not_found');
  if (q.status !== 'received') throw new Error('quote_not_received_yet');

  const [hospital] = await db
    .select({ name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.id, q.hospitalId))
    .limit(1);

  await db
    .update(caseQuotes)
    .set({ status: 'selected', updatedAt: new Date() })
    .where(eq(caseQuotes.id, q.id));

  await db
    .update(caseQuotes)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(
      and(
        eq(caseQuotes.organizationId, organizationId),
        eq(caseQuotes.caseId, q.caseId),
        inArray(caseQuotes.status, ['requested', 'received']),
        sql`${caseQuotes.id} <> ${q.id}`,
      ),
    );

  await db
    .update(cases)
    .set({
      estimatedTotalKrw: q.totalKrw,
      updatedAt: new Date(),
    })
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, q.caseId)));

  await addCaseEvent(organizationId, q.caseId, {
    eventType: 'quote_accepted',
    actorRole: 'agency',
    actorUserId,
    title: `견적 수락 — ${hospital?.name ?? '병원'}`,
    description: q.totalKrw != null ? `₩${q.totalKrw.toLocaleString('ko-KR')}` : undefined,
    relatedEntityType: 'case_quote',
    relatedEntityId: q.id,
    payload: { hospitalId: q.hospitalId, totalKrw: q.totalKrw },
  });

  const [c] = await db
    .select({ stage: cases.stage })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.id, q.caseId)))
    .limit(1);
  if (c && (c.stage === 'scoping' || c.stage === 'rfq_sent' || c.stage === 'quoted')) {
    await transitionStage(organizationId, actorUserId, q.caseId, 'accepted', '견적 수락');
  }
}

/** 견적 수동 탈락 처리 (환자 거절·조건 불가 등). */
export async function rejectQuote(
  organizationId: string,
  actorUserId: string | null,
  quoteId: string,
  reason?: string,
): Promise<void> {
  const [q] = await db
    .select({
      id: caseQuotes.id,
      caseId: caseQuotes.caseId,
      hospitalId: caseQuotes.hospitalId,
      status: caseQuotes.status,
    })
    .from(caseQuotes)
    .where(and(eq(caseQuotes.organizationId, organizationId), eq(caseQuotes.id, quoteId)))
    .limit(1);
  if (!q) throw new Error('quote_not_found');
  if (q.status === 'selected') throw new Error('cannot_reject_selected');

  const [hospital] = await db
    .select({ name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.id, q.hospitalId))
    .limit(1);

  await db
    .update(caseQuotes)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(caseQuotes.id, q.id));

  await addCaseEvent(organizationId, q.caseId, {
    eventType: 'quote_rejected',
    actorRole: 'agency',
    actorUserId,
    title: `견적 탈락 — ${hospital?.name ?? '병원'}`,
    description: reason,
    relatedEntityType: 'case_quote',
    relatedEntityId: q.id,
  });
}
