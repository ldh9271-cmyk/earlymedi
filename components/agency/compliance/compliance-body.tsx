'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, FileDown, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import {
  checkAdCopy,
  COUNTRY_AD_GUIDELINES,
  type AdViolation,
} from '@/lib/compliance/medical-ad-rules';
import { quarterCode, quarterRange, summarizeKoiha } from '@/lib/compliance/koiha-csv';

const SAMPLE_COPY = '국내 1위 성형외과 — 100% 안전한 코재수술. 환자 후기 99% 만족. 지금 50% 할인!';
const COMPLIANT_COPY =
  '코재수술 전문 — 자연스러운 라인을 추구합니다. 부작용·회복기간 안내는 상담 시 함께 드립니다. (이번 달 한정 30% 할인, 대상: 신규 환자, 기간 2026-06-01~30)';

const AGE_BANDS = ['20_29', '30_39', '40_49', '50_59'] as const;
const NATIONALITIES = ['CHN', 'JPN', 'RUS', 'VNM', 'THA', 'ARE', 'USA'];
const CATEGORIES = ['plastic_surgery', 'dermatology', 'hair', 'dental', 'ophthalmology', 'checkup'];
const REVENUES = [5_400_000, 8_400_000, 11_000_000, 16_000_000, 24_000_000];

const MOCK_KOIHA_ROWS: Array<{
  patientNationality: string;
  sex: 'male' | 'female' | 'other' | 'unknown';
  ageBand: '0_19' | '20_29' | '30_39' | '40_49' | '50_59' | '60_plus';
  procedureCategory: string;
  entryDate: string;
  exitDate: string;
  grossRevenueKrw: number;
  patientPaidBp: number;
  insuranceCovered: boolean;
}> = Array.from({ length: 49 }, (_, i) => ({
  patientNationality: NATIONALITIES[i % NATIONALITIES.length] ?? 'CHN',
  sex: i % 3 === 0 ? 'male' : 'female',
  ageBand: AGE_BANDS[i % AGE_BANDS.length] ?? '30_39',
  procedureCategory: CATEGORIES[i % CATEGORIES.length] ?? 'plastic_surgery',
  entryDate: `2026-${String((i % 3) + 4).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  exitDate: `2026-${String((i % 3) + 4).padStart(2, '0')}-${String(((i + 7) % 28) + 1).padStart(2, '0')}`,
  grossRevenueKrw: REVENUES[i % REVENUES.length] ?? 8_400_000,
  patientPaidBp: 10_000,
  insuranceCovered: false,
}));

export function ComplianceBody(): JSX.Element {
  const [draft, setDraft] = useState(SAMPLE_COPY);
  const violations = useMemo(() => checkAdCopy(draft), [draft]);
  const critical = violations.filter((v) => v.severity === 'critical');
  const warning = violations.filter((v) => v.severity === 'warning');
  const info = violations.filter((v) => v.severity === 'info');

  const quarter = { year: 2026, quarter: 2 } as const;
  const range = quarterRange(quarter);
  const summary = useMemo(() => summarizeKoiha(MOCK_KOIHA_ROWS), []);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          유치업체 운영 · 컴플라이언스
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-[40px] md:leading-[1.1]">
          KOIHA · 의료법 27조의2
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          분기 통계 자동 제출(KOIHA), 광고 가이드라인 자동 검사(의료법 27조의2), 국가별 의료광고 규제(중·일·미) 가이드.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">광고 카피 자동 검사</CardTitle>
          <CardDescription>
            의료법 제27조의2 — 거짓·과장·비교·비방 광고 금지. 입력한 카피를 실시간 검사합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">광고 카피 (한국어/외국어)</label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="block w-full rounded-md border bg-card p-3 text-sm font-mono"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDraft(SAMPLE_COPY)}>
                  위반 예시
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDraft(COMPLIANT_COPY)}>
                  준수 예시
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDraft('')}>
                  비우기
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={critical.length > 0 ? 'destructive' : 'care'}>
                  Critical {critical.length}
                </Badge>
                <Badge variant={warning.length > 0 ? 'hospitality' : 'secondary'}>Warning {warning.length}</Badge>
                <Badge variant="secondary">Info {info.length}</Badge>
                {violations.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-care-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 위반 사항이 감지되지 않았습니다
                  </span>
                ) : null}
              </div>

              {violations.length === 0 ? (
                <div className="rounded-md border border-dashed bg-care-50/40 p-4 text-xs text-care-800">
                  의료법 27조의2 자동 헤이리스틱 통과. 단, 자동 검사는 false negative가 있을 수 있으니 매뉴얼 리뷰 권장.
                </div>
              ) : (
                <ul className="space-y-2">
                  {violations.map((v, i) => (
                    <ViolationRow key={i} v={v} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">국가별 의료광고 규제</CardTitle>
            <CardDescription>중국·일본·미국 — 27조의2 외 추가 준수 사항.</CardDescription>
          </div>
          <Badge variant="brand">3 country profiles</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {(['CN', 'JP', 'US'] as const).map((cc) => (
              <div key={cc} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{cc}</span>
                  <Badge variant="secondary" className="rounded-full">
                    {cc === 'CN' ? '중국' : cc === 'JP' ? '일본' : '미국'}
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {COUNTRY_AD_GUIDELINES[cc]?.notes.map((n, i) => (
                    <li key={i} className="leading-relaxed">
                      · {n}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">KOIHA 분기 통계 제출</CardTitle>
            <CardDescription>
              의료법 시행규칙 제19조의2 — 분기마다 환자 수·국적·시술 통계를 보건복지부에 제출.
            </CardDescription>
          </div>
          <Badge variant="care">{quarterCode(quarter)} · {range.start} ~ {range.end}</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCell label="총 환자 수" value={summary.totalPatients.toString()} />
            <SummaryCell label="총 매출" value={`₩${(summary.totalRevenueKrw / 1_000_000).toFixed(1)}M`} />
            <SummaryCell label="국적 수" value={summary.byNationality.length.toString()} />
            <SummaryCell label="진료과 수" value={summary.byCategory.length.toString()} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                국적별
              </div>
              <ul className="space-y-1.5 text-xs">
                {summary.byNationality.map((n) => (
                  <li key={n.code} className="flex items-baseline justify-between">
                    <span className="font-mono">{n.code}</span>
                    <span className="text-muted-foreground">
                      {n.count}명 · ₩{(n.revenueKrw / 1_000_000).toFixed(1)}M
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                진료과별
              </div>
              <ul className="space-y-1.5 text-xs">
                {summary.byCategory.map((c) => (
                  <li key={c.category} className="flex items-baseline justify-between">
                    <span>{c.category}</span>
                    <span className="text-muted-foreground">
                      {c.count}건 · ₩{(c.revenueKrw / 1_000_000).toFixed(1)}M
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="brand" className="rounded-full">
              <FileDown className="mr-1 h-3.5 w-3.5" /> KOIHA CSV 내보내기
            </Button>
            <Button variant="outline" className="rounded-full">
              미리보기
            </Button>
            <span className="text-[11px] text-muted-foreground">
              파일명 <span className="font-mono">koiha_{quarterCode(quarter)}_{summary.totalPatients}.csv</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ComplianceTile
          icon={ShieldCheck}
          title="환자 동의서"
          body="의료정보 위탁 · 국외 이전 · 마케팅 수신 분리 동의."
          status="ok"
        />
        <ComplianceTile
          icon={ShieldCheck}
          title="PHI 접근 감사 로그"
          body="10년 보존 · 매월 자동 검증."
          status="ok"
        />
        <ComplianceTile
          icon={ShieldCheck}
          title="개인정보 영향평가"
          body="연 1회 수행 · 다음 평가 2026-09."
          status="upcoming"
        />
      </div>

      <div className="pt-2 text-[11px] text-muted-foreground">
        자동 검사는 헤이리스틱 기반입니다. 의료법 27조의2·시행규칙의 정확한 해석은 법무 검토를 거치세요.
      </div>
    </div>
  );
}

function ViolationRow({ v }: { v: AdViolation }): JSX.Element {
  const bg =
    v.severity === 'critical'
      ? 'border-destructive/40 bg-destructive/5'
      : v.severity === 'warning'
        ? 'border-hospitality-300/60 bg-hospitality-50/60'
        : 'border-border bg-muted/30';
  const badge =
    v.severity === 'critical' ? (
      <Badge variant="destructive">critical</Badge>
    ) : v.severity === 'warning' ? (
      <Badge variant="hospitality">warning</Badge>
    ) : (
      <Badge variant="secondary">info</Badge>
    );
  return (
    <li className={`rounded-md border px-3 py-2 ${bg}`}>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        <span className="font-mono text-[10px] text-muted-foreground">{v.code}</span>
        <span className="text-xs font-semibold">&ldquo;{v.matched}&rdquo;</span>
      </div>
      <div className="mt-1 text-xs">{v.message}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{v.guidance}</div>
    </li>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function ComplianceTile({
  icon: Icon,
  title,
  body,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  status: 'ok' | 'upcoming' | 'attention';
}): JSX.Element {
  const accent =
    status === 'ok'
      ? 'text-care-700 bg-care-50'
      : status === 'upcoming'
        ? 'text-brand-700 bg-brand-50'
        : 'text-hospitality-700 bg-hospitality-50';
  const tag = status === 'ok' ? '준수 중' : status === 'upcoming' ? '예정' : '주의';
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant={status === 'ok' ? 'care' : status === 'upcoming' ? 'brand' : 'hospitality'}>
          {tag}
        </Badge>
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}
