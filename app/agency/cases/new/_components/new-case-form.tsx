'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { createCaseAction } from '../../actions';

/**
 * 새 케이스 생성 폼. 필수는 환자·제목뿐이고 나머지(시술 카테고리,
 * 대상 병원, 일정, 예산)는 케이스를 연 뒤에도 채울 수 있는 선택
 * 입력이다. 저장하면 케이스 상세로 이동 — RFQ 발송은 /agency/quotes
 * 워크스페이스에서 이어서 진행한다.
 */

const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'normal', label: '보통' },
  { value: 'high', label: '높음' },
  { value: 'urgent', label: '긴급' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  hair: '모발이식',
  dental: '치과',
  ophthalmology: '안과',
  obstetrics: '산부인과',
  oriental: '한방',
  checkup: '건강검진',
  orthopedic: '정형외과',
  cardiology: '심장내과',
  oncology: '종양·암',
  gastroenterology: '소화기내과',
  neurology: '신경과',
  urology: '비뇨의학과',
  ent: '이비인후과',
  fertility: '난임',
  cosmetic_dental: '심미치과',
  general: '일반진료',
};

export function NewCaseForm({
  patients,
  hospitals,
  defaultPatientId,
}: {
  patients: Array<{ id: string; fullName: string; nationality: string | null }>;
  hospitals: Array<{ id: string; name: string }>;
  defaultPatientId: string | null;
}): JSX.Element {
  const router = useRouter();
  const [patientId, setPatientId] = useState(
    defaultPatientId && patients.some((p) => p.id === defaultPatientId) ? defaultPatientId : '',
  );
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalIds, setHospitalIds] = useState<Set<string>>(new Set());
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;

  const filteredHospitals = useMemo(
    () =>
      hospitals.filter((h) =>
        h.name.toLowerCase().includes(hospitalSearch.trim().toLowerCase()),
      ),
    [hospitals, hospitalSearch],
  );

  function toggleCategory(key: string): void {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleHospital(id: string): void {
    setHospitalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!patientId) {
      toast.error('환자를 선택하세요.');
      return;
    }
    if (title.trim().length < 2) {
      toast.error('케이스 제목을 2자 이상 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const total = estimatedTotal.replace(/[^\d]/g, '');
      const result = await createCaseAction({
        patientId,
        title: title.trim(),
        priority,
        targetProcedureCategories: Array.from(categories),
        targetHospitalIds: Array.from(hospitalIds),
        estimatedArrivalDate: arrival || undefined,
        estimatedDepartureDate: departure || undefined,
        estimatedTotalKrw: total ? Number(total) : undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success(`케이스 ${result.caseNumber} 를 생성했습니다.`);
      router.push(`/agency/cases/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '케이스 생성 실패');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nc-patient">환자 *</Label>
              <select
                id="nc-patient"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  const p = patients.find((x) => x.id === e.target.value);
                  if (p && !title.trim()) setTitle(`${p.fullName} — `);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">— 환자 선택 —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                    {p.nationality ? ` (${p.nationality})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                환자가 없으면{' '}
                <a href="/agency/patients" className="underline">환자 CRM</a>
                에서 먼저 등록하세요. 인박스 대화에서 [+ 환자 CRM에 등록]으로도 만들 수 있습니다.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-priority">우선순위</Label>
              <select
                id="nc-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-title">케이스 제목 *</Label>
            <Input
              id="nc-title"
              placeholder={`예) ${selectedPatient?.fullName ?? '환자명'} — 코성형 + 모발이식`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>대상 시술 카테고리</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const active = categories.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-border bg-background text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>대상 병원 (선택 — RFQ 후보)</Label>
            <Input
              placeholder="병원 검색…"
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-2">
              {filteredHospitals.length === 0 ? (
                <p className="px-2 py-2 text-center text-xs text-muted-foreground">검색 결과 없음</p>
              ) : (
                filteredHospitals.slice(0, 60).map((h) => (
                  <label
                    key={h.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={hospitalIds.has(h.id)}
                      onChange={() => toggleHospital(h.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate">{h.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              선택 {hospitalIds.size}개 — 선택한 병원의 수수료·예약금 정책이 케이스에 스냅샷됩니다.
              나중에 RFQ 발송 시 추가해도 됩니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-arrival">예상 도착일</Label>
              <Input
                id="nc-arrival"
                type="date"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-departure">예상 출국일</Label>
              <Input
                id="nc-departure"
                type="date"
                value={departure}
                min={arrival || undefined}
                onChange={(e) => setDeparture(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-total">예상 총액 (KRW)</Label>
              <Input
                id="nc-total"
                inputMode="numeric"
                placeholder="3000000"
                value={estimatedTotal}
                onChange={(e) => setEstimatedTotal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-tags">태그 (쉼표로 구분)</Label>
            <Input
              id="nc-tags"
              placeholder="VIP, 재방문"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          취소
        </Button>
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? '생성 중…' : '케이스 생성'}
        </Button>
      </div>
    </form>
  );
}
