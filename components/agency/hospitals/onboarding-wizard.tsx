'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';

const STEP_LABELS = ['기본 정보', '등록증', '송객 수수료', '예약금 정책', '시술 차트 운영', '정산 주기', '계약 전자서명'];

const CATEGORIES: Array<{ value: string; label: string; defaultBp: number }> = [
  { value: 'plastic_surgery', label: '성형', defaultBp: 3000 },
  { value: 'dermatology', label: '피부', defaultBp: 2000 },
  { value: 'hair', label: '모발', defaultBp: 2500 },
  { value: 'dental', label: '치과', defaultBp: 1500 },
  { value: 'ophthalmology', label: '안과', defaultBp: 1500 },
  { value: 'obstetrics', label: '산부인과', defaultBp: 1500 },
  { value: 'oriental', label: '한의원', defaultBp: 1500 },
  { value: 'checkup', label: '검진', defaultBp: 1000 },
  { value: 'orthopedic', label: '정형', defaultBp: 1000 },
];

export function HospitalOnboardingWizard(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [hospitalId, setHospitalId] = useState<string | null>(null);

  const [basics, setBasics] = useState({
    name: '',
    legalName: '',
    countryCode: 'KR',
    city: '',
    addressLine1: '',
    primaryCategories: [] as string[],
    websiteUrl: '',
  });
  const [licenses, setLicenses] = useState({ licenseNumber: '', foreignPatientLicenseNumber: '' });

  const [referralRates, setReferralRates] = useState<Array<{ category: string; rateBp: number }>>(
    CATEGORIES.map((c) => ({ category: c.value, rateBp: c.defaultBp })),
  );

  const [deposit, setDeposit] = useState({
    isEnabled: true,
    percentage: 20,
    daysBeforeVisit: 7,
    refundTiers: [
      { daysBeforeVisitMin: 30, refundBp: 10_000 },
      { daysBeforeVisitMin: 14, refundBp: 7000 },
      { daysBeforeVisitMin: 7, refundBp: 5000 },
      { daysBeforeVisitMin: 3, refundBp: 0 },
    ],
  });

  const [chartWorkflow, setChartWorkflow] = useState({
    aiAutofillEnabled: true,
    requirePatientReconsent: true,
    varianceThresholdBp: 1500,
  });

  const [settlementCycle, setSettlementCycle] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [contractSigned, setContractSigned] = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/agency/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basics),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { data: { id: string; slug: string } };
    },
    onSuccess: (json) => {
      setHospitalId(json.data.id);
      setStep(1);
      toast.success('기본 정보 저장');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const referralMut = useMutation({
    mutationFn: async () => {
      if (!hospitalId) throw new Error('no_hospital');
      const res = await fetch(`/api/agency/hospitals/${hospitalId}/referral-rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: referralRates }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
  });

  const depositMut = useMutation({
    mutationFn: async () => {
      if (!hospitalId) throw new Error('no_hospital');
      const res = await fetch(`/api/agency/hospitals/${hospitalId}/deposit-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: deposit.isEnabled,
          percentageBp: Math.round(deposit.percentage * 100),
          daysBeforeVisit: deposit.daysBeforeVisit,
          refundTiers: deposit.refundTiers,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
  });

  const checklistMut = useMutation({
    mutationFn: async (patch: Record<string, boolean>) => {
      if (!hospitalId) throw new Error('no_hospital');
      const res = await fetch('/api/agency/hospitals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, checklist: patch }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { data: { id: string; isActiveForMatching: boolean } };
    },
  });

  async function finalize(): Promise<void> {
    try {
      await checklistMut.mutateAsync({ contractSigned: true });
      const finalRes = await checklistMut.mutateAsync({
        licenses: true,
        referralPolicy: true,
        depositPolicy: true,
        chartWorkflow: true,
        settlementCycle: true,
      });
      if (finalRes.data.isActiveForMatching) {
        toast.success('병원이 활성화되었습니다');
      } else {
        toast.warning('일부 체크리스트가 누락되었습니다');
      }
      if (hospitalId) router.push(`/agency/hospitals/${hospitalId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '완료 실패');
    }
  }

  return (
    <div className="space-y-4">
      <Stepper current={step} />

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">① 기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="병원명 *">
              <Input value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} />
            </Field>
            <Field label="의료법인명">
              <Input value={basics.legalName} onChange={(e) => setBasics({ ...basics, legalName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="국가">
                <Input value={basics.countryCode} maxLength={2} onChange={(e) => setBasics({ ...basics, countryCode: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="도시">
                <Input value={basics.city} onChange={(e) => setBasics({ ...basics, city: e.target.value })} />
              </Field>
            </div>
            <Field label="주소">
              <Input value={basics.addressLine1} onChange={(e) => setBasics({ ...basics, addressLine1: e.target.value })} />
            </Field>
            <Field label="웹사이트">
              <Input value={basics.websiteUrl} onChange={(e) => setBasics({ ...basics, websiteUrl: e.target.value })} />
            </Field>
            <Field label="주력 진료과">
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((c) => {
                  const active = basics.primaryCategories.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setBasics((b) => ({
                          ...b,
                          primaryCategories: active
                            ? b.primaryCategories.filter((x) => x !== c.value)
                            : [...b.primaryCategories, c.value],
                        }));
                      }}
                      className={`rounded-full border px-2.5 py-1 text-xs ${active ? 'bg-brand-600 text-white' : ''}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex justify-end">
              <Button variant="brand" disabled={!basics.name || createMut.isPending} onClick={() => createMut.mutate()}>
                저장 후 다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">② 등록증</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="의료기관 개설신고증 번호">
              <Input value={licenses.licenseNumber} onChange={(e) => setLicenses({ ...licenses, licenseNumber: e.target.value })} />
            </Field>
            <Field label="외국인환자 유치 의료기관 등록증 번호">
              <Input value={licenses.foreignPatientLicenseNumber} onChange={(e) => setLicenses({ ...licenses, foreignPatientLicenseNumber: e.target.value })} />
            </Field>
            <p className="text-xs text-muted-foreground">
              파일 업로드는 Phase 1.x 또는 Phase 7의 컴플라이언스 모듈에서 활성화됩니다. 지금은
              번호만 등록 후 다음 단계로 진행.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>이전</Button>
              <Button
                variant="brand"
                onClick={async () => {
                  await checklistMut.mutateAsync({ licenses: true });
                  setStep(2);
                }}
              >
                저장 후 다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">③ 송객 수수료 정책</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              진료과별 기본 송객 수수료. 시술별 오버라이드는 병원 상세에서 가능 (Phase 6 정산
              엔진과 자동 연동).
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {referralRates.map((r, idx) => {
                const cat = CATEGORIES.find((c) => c.value === r.category);
                return (
                  <div key={r.category} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="flex-1">{cat?.label ?? r.category}</span>
                    <Input
                      type="number"
                      step={1}
                      className="h-8 w-20"
                      value={r.rateBp / 100}
                      onChange={(e) =>
                        setReferralRates((arr) => {
                          const next = [...arr];
                          next[idx] = { ...r, rateBp: Math.round(Number(e.target.value || 0) * 100) };
                          return next;
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>이전</Button>
              <Button
                variant="brand"
                onClick={async () => {
                  await referralMut.mutateAsync();
                  await checklistMut.mutateAsync({ referralPolicy: true });
                  setStep(3);
                }}
              >
                저장 후 다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">④ 예약금 정책</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="예약금 비율 (%)">
                <Input
                  type="number"
                  step={1}
                  value={deposit.percentage}
                  onChange={(e) => setDeposit({ ...deposit, percentage: Number(e.target.value || 0) })}
                />
              </Field>
              <Field label="시술일 며칠 전까지">
                <Input
                  type="number"
                  step={1}
                  value={deposit.daysBeforeVisit}
                  onChange={(e) => setDeposit({ ...deposit, daysBeforeVisit: Number(e.target.value || 0) })}
                />
              </Field>
            </div>
            <Field label="환불 티어 (D-N 이상일 때 환불 %)">
              <div className="space-y-1">
                {deposit.refundTiers.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-xs text-muted-foreground">D-{t.daysBeforeVisitMin}</span>
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={t.refundBp / 100}
                      onChange={(e) =>
                        setDeposit((d) => {
                          const next = [...d.refundTiers];
                          next[idx] = { ...t, refundBp: Math.round(Number(e.target.value || 0) * 100) };
                          return { ...d, refundTiers: next };
                        })
                      }
                    />
                    <span className="text-xs">%</span>
                  </div>
                ))}
              </div>
            </Field>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>이전</Button>
              <Button
                variant="brand"
                onClick={async () => {
                  await depositMut.mutateAsync();
                  await checklistMut.mutateAsync({ depositPolicy: true });
                  setStep(4);
                }}
              >
                저장 후 다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⑤ 시술 차트 운영 방식</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={chartWorkflow.aiAutofillEnabled}
                onChange={(e) => setChartWorkflow({ ...chartWorkflow, aiAutofillEnabled: e.target.checked })}
              />
              AI 차트 자동 채움 사용
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={chartWorkflow.requirePatientReconsent}
                onChange={(e) => setChartWorkflow({ ...chartWorkflow, requirePatientReconsent: e.target.checked })}
              />
              견적 차이 15% 초과 시 환자 재동의 필수
            </label>
            <Field label="견적-차트 변동 허용 (%)">
              <Input
                type="number"
                value={chartWorkflow.varianceThresholdBp / 100}
                onChange={(e) =>
                  setChartWorkflow({ ...chartWorkflow, varianceThresholdBp: Math.round(Number(e.target.value || 0) * 100) })
                }
              />
            </Field>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>이전</Button>
              <Button
                variant="brand"
                onClick={async () => {
                  await checklistMut.mutateAsync({ chartWorkflow: true });
                  setStep(5);
                }}
              >
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⑥ 정산 주기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['weekly', 'biweekly', 'monthly'] as const).map((c) => (
              <label key={c} className={`block rounded-md border p-3 ${settlementCycle === c ? 'border-brand-600 ring-2 ring-brand-200' : ''}`}>
                <input
                  type="radio"
                  className="mr-2"
                  checked={settlementCycle === c}
                  onChange={() => setSettlementCycle(c)}
                />
                {c === 'weekly' ? '매주 (월요일)' : c === 'biweekly' ? '격주 (2주마다)' : '매월 (말일)'}
              </label>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)}>이전</Button>
              <Button
                variant="brand"
                onClick={async () => {
                  await checklistMut.mutateAsync({ settlementCycle: true });
                  setStep(6);
                }}
              >
                저장 후 다음
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⑦ 계약 전자서명</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="font-semibold">병원 협력 계약서 (요약)</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>송객 수수료: 진료과별 정책 (③ 단계 확인)</li>
                <li>예약금 정책: ④ 단계 환불 티어 적용</li>
                <li>시술 차트: 병원 작성 → 에이전시 검증 → 환자 공유 3단 워크플로우</li>
                <li>정산 주기: ⑥ 단계 선택값 ({settlementCycle})</li>
                <li>본 계약은 양방 디지털 서명 시점부터 유효합니다.</li>
              </ul>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={contractSigned} onChange={(e) => setContractSigned(e.target.checked)} />위 내용을 확인했으며 협력 계약에 동의합니다.
            </label>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(5)}>이전</Button>
              <Button variant="brand" disabled={!contractSigned} onClick={finalize}>
                활성화
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stepper({ current }: { current: number }): JSX.Element {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEP_LABELS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${done ? 'bg-care-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {idx + 1}
            </span>
            <span className={active ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</span>
            {idx < STEP_LABELS.length - 1 ? <span className="text-muted-foreground/40">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
