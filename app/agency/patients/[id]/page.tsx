import { notFound } from 'next/navigation';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getPatientById, logPatientView } from '@/lib/db/repositories/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { formatLocal } from '@/lib/utils/date';
import { RevealPiiButton } from '@/components/agency/patients/reveal-pii-button';

export const metadata = { title: '환자 상세' };

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const data = await withRls(ctx, async () => {
    const out = await getPatientById(ctx.orgId, params.id);
    if (out) await logPatientView(ctx.orgId, ctx.userId, params.id);
    return out;
  });
  if (!data) notFound();
  const { patient, history } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{patient.aliasName ?? '환자'}</div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="brand">{patient.status}</Badge>
            <span>{patient.nationality ?? '국적 미상'}</span>
            <span>· {patient.dateOfBirth ?? '생년월일 미상'}</span>
            <span>· {patient.sex}</span>
            {patient.sourceChannel ? <span>· {patient.sourceChannel}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">대화 보기</Button>
          <Button variant="brand">새 케이스 (Phase 5)</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
            <CardDescription className="text-xs">
              민감 정보(여권·전화·이메일·외국인등록번호)는 [열기] 버튼을 누를 때만 복호화되며 모든
              조회는 감사 로그에 기록됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="이름 (성/이름)">
              <div>{patient.surname ?? '—'} / {patient.givenNames ?? '—'}</div>
            </Field>
            <Field label="국적">
              <div>{patient.nationality ?? '—'}</div>
            </Field>
            <Field label="거주 국가">
              <div>{patient.countryCode ?? '—'}</div>
            </Field>
            <Field label="언어">
              <div>{patient.locale ?? '—'}</div>
            </Field>
            <Field label="여권번호">
              {patient.passportHash ? <RevealPiiButton patientId={patient.id} field="passport" /> : <span className="text-muted-foreground">미등록</span>}
            </Field>
            <Field label="전화">
              {patient.phoneHash ? <RevealPiiButton patientId={patient.id} field="phone" /> : <span className="text-muted-foreground">미등록</span>}
            </Field>
            <Field label="이메일">
              {patient.emailHash ? <RevealPiiButton patientId={patient.id} field="email" /> : <span className="text-muted-foreground">미등록</span>}
            </Field>
            <Field label="레코드 생성">
              <div>{formatLocal(new Date(patient.createdAt), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}</div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">의료 히스토리</CardTitle>
            <CardDescription className="text-xs">알레르기 · 복용약 · 과거 시술 · 임신/수유</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">등록된 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider">{h.category}</span>
                      {h.severity ? <span className="text-muted-foreground">{h.severity}</span> : null}
                    </div>
                    <div className="mt-1 text-foreground">{h.description}</div>
                    {h.onsetDate ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">발현 {h.onsetDate}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">타임라인</CardTitle>
            <CardDescription className="text-xs">
              인박스 메시지·견적·예약·시술 차트·결제·사후관리 이벤트가 Phase 5+ 에서 통합 표시됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              현재는 등록 이벤트만 표시. 케이스 생성 시 자동 누적.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}
