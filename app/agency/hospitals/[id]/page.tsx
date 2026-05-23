import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getHospital, isOnboardingComplete } from '@/lib/db/repositories/hospitals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';

export const metadata = { title: '병원 상세' };

export default async function HospitalDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const data = await withRls(ctx, () => getHospital(ctx.orgId, params.id));
  if (!data) notFound();
  const { hospital, doctors, referralRates, depositPolicy } = data;
  const complete = isOnboardingComplete(hospital.onboardingChecklist);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{hospital.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={complete ? 'care' : 'destructive'}>
            {complete ? '활성 (매칭 가능)' : '비활성 (매칭 차단)'}
          </Badge>
          <span>{hospital.countryCode}</span>
          {hospital.primaryCategories.map((c) => (
            <Badge key={c} variant="brand">
              {c.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">송객 수수료 정책</CardTitle>
            <CardDescription>진료과별 기본 + 시술별 오버라이드 ({referralRates.length}건)</CardDescription>
          </CardHeader>
          <CardContent>
            {referralRates.length === 0 ? (
              <p className="text-xs text-muted-foreground">정책 미설정 → 매칭 차단 상태입니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left">진료과/시술</th>
                    <th className="text-right">요율</th>
                    <th className="text-right">베이스</th>
                    <th className="text-right">지급 시점</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {referralRates.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">{r.procedureCode ?? r.category ?? '(기본)'}</td>
                      <td className="py-2 text-right font-medium">{(r.rateBp / 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-xs">{r.feeBase}</td>
                      <td className="py-2 text-right text-xs">{r.payoutTrigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">예약금 정책</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {depositPolicy ? (
              <>
                <Row label="활성" value={depositPolicy.isEnabled ? '예' : '아니오'} />
                <Row
                  label="기본 금액"
                  value={
                    depositPolicy.percentageBp
                      ? `${(depositPolicy.percentageBp / 100).toFixed(1)}%`
                      : depositPolicy.fixedAmountKrw
                        ? `₩${depositPolicy.fixedAmountKrw.toLocaleString('ko-KR')}`
                        : '—'
                  }
                />
                <Row label="수취 주체" value={depositPolicy.collector} />
                <Row label="시점" value={depositPolicy.timing} />
                <Row label="시술 D-" value={`${depositPolicy.daysBeforeVisit}일 전`} />
                <div className="pt-2 text-xs text-muted-foreground">
                  환불 티어 {depositPolicy.refundTiersJson.length}개 설정됨.
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">예약금 정책 미설정.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">의사 ({doctors.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <div key={d.id} className="rounded-md border p-3 text-sm">
                  <div className="font-semibold">{d.fullName}</div>
                  <div className="text-xs text-muted-foreground">{d.title} · {d.specialty}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.languagesSpoken.map((l) => (
                      <span key={l} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">온보딩 체크리스트</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['basics', '기본 정보'],
                  ['licenses', '등록증'],
                  ['referralPolicy', '송객 수수료'],
                  ['depositPolicy', '예약금'],
                  ['chartWorkflow', '차트 운영'],
                  ['settlementCycle', '정산 주기'],
                  ['contractSigned', '계약 서명'],
                ] as Array<[keyof typeof hospital.onboardingChecklist, string]>
              ).map(([k, label]) => (
                <li key={k} className="flex items-center gap-2 text-sm">
                  {hospital.onboardingChecklist[k] ? (
                    <CheckCircle2 className="h-4 w-4 text-care-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between border-b border-dashed border-border/50 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
