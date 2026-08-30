import { Stamp } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { visaRequests } from '@/drizzle/schema/visa';
import { patients } from '@/drizzle/schema/patients';
import { hospitals } from '@/drizzle/schema/hospitals';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';
import { createVisaRequestAction, updateVisaStatusAction } from './_actions';

export const metadata = { title: '비자 · 여행 서류' };
export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  C_3_3: 'C-3-3 단기 의료관광',
  G_1_10: 'G-1-10 치료 동반 보호자',
  C_3_9: 'C-3-9 단기 일반',
  E_6: 'E-6 의료기술 연수',
  other: '기타',
};

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'outline' | 'destructive' }> = {
  drafting: { label: '초청장 준비 중', variant: 'hospitality' },
  invitation_issued: { label: '초청장 발급됨', variant: 'brand' },
  submitted: { label: '공관 접수', variant: 'brand' },
  approved: { label: '승인', variant: 'care' },
  rejected: { label: '거절', variant: 'destructive' },
  cancelled: { label: '취소', variant: 'outline' },
  expired: { label: '만료', variant: 'outline' },
};

/** 상태별 다음 액션 버튼 — _actions.ts 의 TRANSITIONS 와 짝을 맞춘다. */
const NEXT_ACTIONS: Record<string, Array<{ next: string; label: string; needsReason?: boolean }>> = {
  drafting: [
    { next: 'invitation_issued', label: '초청장 발급 완료' },
    { next: 'cancelled', label: '요청 취소' },
  ],
  invitation_issued: [
    { next: 'submitted', label: '공관 접수 처리' },
    { next: 'cancelled', label: '요청 취소' },
  ],
  submitted: [
    { next: 'approved', label: '승인 기록' },
    { next: 'rejected', label: '거절 기록', needsReason: true },
  ],
};

/**
 * 비자 · 여행 서류 — 해외 환자의 의료관광 비자 절차 관리.
 *
 * 비자 발급 주체는 재외공관이다. 이 화면은 병원 초청장 준비 →
 * 공관 접수 → 심사 결과까지의 진행 상태를 케이스와 함께 기록한다.
 */
export default async function AgencyVisaPage({
  searchParams,
}: {
  searchParams: { error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const { rows, patientOptions, hospitalOptions } = await withRls(ctx, async () => {
    const rows = await db
      .select({
        id: visaRequests.id,
        category: visaRequests.category,
        status: visaRequests.status,
        consulateCountryCode: visaRequests.consulateCountryCode,
        consulateCity: visaRequests.consulateCity,
        intendedEntryDate: visaRequests.intendedEntryDate,
        intendedExitDate: visaRequests.intendedExitDate,
        durationDays: visaRequests.durationDays,
        submittedAt: visaRequests.submittedAt,
        decisionAt: visaRequests.decisionAt,
        decisionReason: visaRequests.decisionReason,
        notes: visaRequests.notes,
        createdAt: visaRequests.createdAt,
        patientName: patients.fullName,
        patientNationality: patients.nationality,
        hospitalName: hospitals.name,
      })
      .from(visaRequests)
      .innerJoin(patients, eq(patients.id, visaRequests.patientId))
      .leftJoin(hospitals, eq(hospitals.id, visaRequests.inviterHospitalId))
      .where(eq(visaRequests.organizationId, ctx.orgId))
      .orderBy(desc(visaRequests.createdAt))
      .limit(100);

    const patientOptions = await db
      .select({ id: patients.id, name: patients.fullName, nationality: patients.nationality })
      .from(patients)
      .where(eq(patients.organizationId, ctx.orgId))
      .orderBy(patients.fullName)
      .limit(200);

    const hospitalOptions = await db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .where(eq(hospitals.organizationId, ctx.orgId))
      .orderBy(hospitals.name)
      .limit(200);

    return { rows, patientOptions, hospitalOptions };
  });

  const counts = {
    drafting: rows.filter((r) => r.status === 'drafting').length,
    issued: rows.filter((r) => r.status === 'invitation_issued').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    approved: rows.filter((r) => r.status === 'approved').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">비자 · 여행 서류</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          의료관광 비자(C-3-3 단기 의료관광 · G-1-10 보호자) 절차를 관리합니다 — 병원 초청장
          준비부터 재외공관 접수, 심사 결과까지. 발급 여부는 공관 심사에 따르며, 여기서는
          진행 상태를 기록합니다.
        </p>
      </div>

      {searchParams.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          처리에 실패했습니다: {searchParams.error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['초청장 준비 중', counts.drafting],
          ['초청장 발급됨', counts.issued],
          ['공관 접수', counts.submitted],
          ['승인', counts.approved],
        ].map(([label, n]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">신규 비자 요청</CardTitle>
          <CardDescription className="text-xs">
            환자 CRM에 등록된 환자만 선택할 수 있습니다. 초청 병원·공관·일정은 나중에
            상태를 올리기 전까지 비워 둘 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patientOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              먼저 환자 CRM에서 환자를 등록해 주세요 — 비자 요청은 환자 레코드에 연결됩니다.
            </p>
          ) : (
            <form action={createVisaRequestAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs">
                <span className="mb-1 block font-medium">환자 *</span>
                <select
                  name="patientId"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">선택…</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.nationality ? ` (${p.nationality})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium">비자 종류 *</span>
                <select
                  name="category"
                  required
                  defaultValue="C_3_3"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium">초청 병원</span>
                <select
                  name="inviterHospitalId"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">미정</option>
                  {hospitalOptions.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium">접수 공관 국가 (ISO 2자리)</span>
                <input
                  name="consulateCountryCode"
                  maxLength={2}
                  placeholder="JP"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm uppercase"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium">접수 공관 도시</span>
                <input
                  name="consulateCity"
                  maxLength={80}
                  placeholder="Tokyo"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium">입국 예정</span>
                  <input name="intendedEntryDate" type="date" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium">출국 예정</span>
                  <input name="intendedExitDate" type="date" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                </label>
              </div>
              <label className="text-xs sm:col-span-2">
                <span className="mb-1 block font-medium">메모 (치료 요약 · 특이사항)</span>
                <input
                  name="notes"
                  maxLength={2000}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <div className="self-end">
                <Button type="submit" variant="brand" size="sm">요청 등록</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Stamp}
              title="아직 비자 요청이 없습니다"
              description="위 양식으로 첫 요청을 등록하면 초청장 준비부터 공관 심사 결과까지 이 목록에서 관리됩니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, variant: 'outline' as const };
            const actions = NEXT_ACTIONS[r.status] ?? [];
            const needsReason = actions.some((a) => a.needsReason);
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {r.patientName}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {r.patientNationality ?? ''}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {CATEGORY_LABEL[r.category] ?? r.category}
                      {r.hospitalName ? ` · 초청 ${r.hospitalName}` : ''}
                      {r.consulateCity || r.consulateCountryCode
                        ? ` · 공관 ${[r.consulateCity, r.consulateCountryCode].filter(Boolean).join(', ')}`
                        : ''}
                      {' · 등록 '}
                      {formatLocal(new Date(r.createdAt), 'Asia/Seoul', 'yyyy-MM-dd')}
                    </CardDescription>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    {r.intendedEntryDate ? (
                      <span>
                        체류 예정 {r.intendedEntryDate}
                        {r.intendedExitDate ? ` ~ ${r.intendedExitDate}` : ''}
                        {r.durationDays != null ? ` (${r.durationDays}일)` : ''}
                      </span>
                    ) : null}
                    {r.submittedAt ? (
                      <span>접수 {formatLocal(new Date(r.submittedAt), 'Asia/Seoul', 'yyyy-MM-dd')}</span>
                    ) : null}
                    {r.decisionAt ? (
                      <span>결과 {formatLocal(new Date(r.decisionAt), 'Asia/Seoul', 'yyyy-MM-dd')}</span>
                    ) : null}
                    {r.decisionReason ? <span>사유: {r.decisionReason}</span> : null}
                    {r.notes ? <span className="w-full">메모: {r.notes}</span> : null}
                  </div>
                  {actions.length > 0 ? (
                    <form action={updateVisaStatusAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      {needsReason ? (
                        <input
                          name="reason"
                          maxLength={500}
                          placeholder="거절 사유 (거절 기록 시)"
                          className="h-8 w-56 rounded-md border border-input bg-background px-2 text-xs"
                        />
                      ) : null}
                      {actions.map((a) => (
                        <Button
                          key={a.next}
                          type="submit"
                          name="next"
                          value={a.next}
                          variant={a.next === 'cancelled' || a.next === 'rejected' ? 'outline' : 'brand'}
                          size="sm"
                        >
                          {a.label}
                        </Button>
                      ))}
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
