'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { computeFunnel, type FunnelStage } from '@/lib/analytics/funnel';

/**
 * GlowInsight 본문 — 서버에서 집계한 실데이터(InsightsData)를 그린다.
 * 뷰티 투어와 의료가 한 플랫폼에 있으므로 문의·매출·카테고리 모두
 * 통합 기준. 데이터가 쌓이기 전엔 빈 섹션이 "아직 데이터 없음"으로
 * 표시된다.
 */

export type InsightsData = {
  funnel: FunnelStage[];
  monthly: Array<{ month: string; gmvWon: number; orders: number }>;
  channels: Array<{ name: string; n: number }>;
  countries: Array<{ name: string; n: number }>;
  categories: Array<{ key: string; label: string; n: number; isMedical: boolean }>;
  totals: { paidWon: number; paidCount: number; openCount: number; leadCount: number };
};

const CHANNEL_LABEL: Record<string, string> = {
  web: '웹 문의',
  kakao: 'KakaoTalk',
  line: 'LINE',
  wechat: 'WeChat',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  messenger: 'Messenger',
  naver_talk: 'Naver 톡톡',
  sms: 'SMS',
  email: 'Email',
};

/** 디자인 쇼룸(/showroom/insights)용 데모 데이터. */
export const DEMO_INSIGHTS_DATA: InsightsData = {
  funnel: [
    { key: 'lead', label: '문의 리드', count: 4280 },
    { key: 'qualified', label: 'Qualified', count: 1140 },
    { key: 'case', label: '케이스 생성', count: 612 },
    { key: 'accepted', label: '견적 수락+', count: 388 },
    { key: 'paid', label: '결제 확인', count: 322 },
  ],
  monthly: [
    { month: '2026-03', gmvWon: 295_000_000, orders: 36 },
    { month: '2026-04', gmvWon: 364_000_000, orders: 44 },
    { month: '2026-05', gmvWon: 412_000_000, orders: 49 },
    { month: '2026-06', gmvWon: 388_000_000, orders: 47 },
    { month: '2026-07', gmvWon: 451_000_000, orders: 55 },
    { month: '2026-08', gmvWon: 483_000_000, orders: 58 },
  ],
  channels: [
    { name: 'web', n: 1420 },
    { name: 'kakao', n: 980 },
    { name: 'line', n: 640 },
    { name: 'wechat', n: 520 },
    { name: 'instagram', n: 380 },
    { name: 'whatsapp', n: 210 },
  ],
  countries: [
    { name: 'JP', n: 1480 },
    { name: 'CN', n: 1120 },
    { name: 'US', n: 520 },
    { name: 'VN', n: 380 },
    { name: 'RU', n: 290 },
    { name: 'TW', n: 240 },
  ],
  categories: [
    { key: 'hospital', label: '병원', n: 118, isMedical: true },
    { key: 'hotel', label: '호텔', n: 29, isMedical: false },
    { key: 'travel_package', label: '여행 패키지', n: 16, isMedical: false },
    { key: 'hair', label: '헤어샵', n: 13, isMedical: false },
    { key: 'makeup', label: '메이크업샵', n: 11, isMedical: false },
  ],
  totals: { paidWon: 2_393_000_000, paidCount: 289, openCount: 31, leadCount: 4280 },
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function wonShort(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;
  return String(n);
}

export function InsightsBody({ data }: { data: InsightsData }): JSX.Element {
  const funnel = computeFunnel(data.funnel);
  const top = funnel[0]?.count ?? 0;
  const leadToPaidBp = funnel.length ? funnel[funnel.length - 1]!.cumulativeBp : 0;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">📈 GlowInsight</Badge>
        <h1 className="text-2xl font-bold tracking-tight">GlowInsight 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          문의 → 케이스 → 결제 전환과 매출 · 채널 · 국가 · 카테고리 믹스를 운영 데이터에서
          집계합니다 (뷰티 투어 + 의료 통합).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="누적 결제 확인 매출" value={won(data.totals.paidWon)} />
        <Stat label="결제 확인 주문" value={`${data.totals.paidCount}건`} />
        <Stat label="결제 진행 중" value={`${data.totals.openCount}건`} />
        <Stat
          label="리드 → 결제 전환율"
          value={`${(leadToPaidBp / 100).toFixed(1)}%`}
          sub={`리드 ${data.totals.leadCount}건 기준`}
        />
      </div>

      {/* 전환 퍼널 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">전환 퍼널</CardTitle>
          <CardDescription className="text-xs">
            문의 리드(전 채널) → Qualified → 케이스 → 견적 수락 → 결제 확인
          </CardDescription>
        </CardHeader>
        <CardContent>
          {top === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {funnel.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">{s.label}</div>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-muted/30">
                    <div
                      className="flex h-full items-center rounded bg-brand-500/85 px-2 text-[10px] font-semibold text-white"
                      style={{ width: `${Math.max(top > 0 ? (s.count / top) * 100 : 0, s.count > 0 ? 4 : 0)}%` }}
                    >
                      {s.count > 0 ? s.count : ''}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[10px] text-muted-foreground">
                    {i === 0 ? '100%' : `누적 ${(s.cumulativeBp / 100).toFixed(1)}%`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 월별 매출 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 결제 확인 매출</CardTitle>
            <CardDescription className="text-xs">최근 6개월 · 결제 확인(paid) 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthly.every((m) => m.gmvWon === 0) ? (
              <Empty />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff385c" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ff385c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(m: string) => m.slice(5) + '월'} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => wonShort(v)} width={48} />
                    <Tooltip
                      formatter={(v: number | string) => [won(Number(v)), '매출']}
                      labelFormatter={(m) => `${m}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="gmvWon" stroke="#ff385c" strokeWidth={2} fill="url(#gmv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 채널 믹스 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">문의 채널 믹스</CardTitle>
            <CardDescription className="text-xs">전체 대화 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {data.channels.length === 0 ? (
              <Empty />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.channels.map((c) => ({ ...c, label: CHANNEL_LABEL[c.name] ?? c.name }))}
                    margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={44} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                    <Tooltip formatter={(v: number | string) => [`${v}건`, '문의']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="n" fill="#ff385c" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 국가 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">고객 국가 분포</CardTitle>
            <CardDescription className="text-xs">문의 기준 상위 8개국</CardDescription>
          </CardHeader>
          <CardContent>
            {data.countries.length === 0 ? (
              <Empty />
            ) : (
              <BarList
                rows={data.countries.map((c) => ({ label: c.name, n: c.n }))}
              />
            )}
          </CardContent>
        </Card>

        {/* 카테고리 믹스 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">판매 카테고리 믹스</CardTitle>
            <CardDescription className="text-xs">
              판매 중 리스팅 기준 — 뷰티 투어와 의료가 함께 집계됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.categories.length === 0 ? (
              <Empty />
            ) : (
              <BarList
                rows={data.categories.map((c) => ({
                  label: `${c.label}${c.isMedical ? ' 🏥' : ''}`,
                  n: c.n,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }): JSX.Element {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
        {sub ? <div className="text-[10px] text-muted-foreground/70">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function BarList({ rows }: { rows: Array<{ label: string; n: number }> }): JSX.Element {
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <div className="w-28 shrink-0 truncate text-xs">{r.label}</div>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted/30">
            <div
              className="h-full rounded bg-brand-500/75"
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </div>
          <div className="w-10 shrink-0 text-right text-xs font-semibold">{r.n}</div>
        </div>
      ))}
    </div>
  );
}

function Empty(): JSX.Element {
  return (
    <p className="py-8 text-center text-xs text-muted-foreground">
      아직 데이터가 없습니다 — 운영 데이터가 쌓이면 자동으로 채워집니다.
    </p>
  );
}
