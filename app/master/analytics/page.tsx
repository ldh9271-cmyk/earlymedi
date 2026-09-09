import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import {
  classifyPath, firstViewAt, orderSummary, PROVIDER_KO, recentSignups, resolveRange,
  signupsByDay, signupsByLocale, signupsByMonth, signupsByProvider, signupTotals,
  topPages, topReferrers, trafficByCountry, trafficByDay, trafficByDevice, trafficByHour,
  trafficByLocale, trafficByMonth, trafficTotals, type RangePreset,
} from '@/lib/analytics/report';
import BarChart from './_components/bar-chart';

export const dynamic = 'force-dynamic';
// 쿼리 20개를 한 번에 돌리므로 콜드 스타트까지 겹치면 기본 10초를 넘길 수 있다
export const maxDuration = 30;
export const metadata = { title: '통계 리포트 — 마스터 관리자' };

/**
 * 마스터 통계 리포트 — 트래픽·신규 가입·인기 게시물·결제를 한 화면에.
 *
 * 필터(기간)는 맨 위 한 줄이고 아래 모든 숫자·차트·표가 같은 구간을 본다.
 * 월별 추이만 예외로 항상 최근 12개월이다(월 단위는 12칸이 있어야 읽힌다).
 * KPI 의 증감은 같은 길이의 직전 구간과 비교한다.
 */
const PRESETS: Array<{ key: RangePreset; label: string }> = [
  { key: '7d', label: '최근 7일' }, { key: '30d', label: '최근 30일' }, { key: '90d', label: '최근 90일' }, { key: '12m', label: '최근 12개월' },
];

const COUNTRY_KO: Record<string, string> = {
  KR: '한국', JP: '일본', CN: '중국', US: '미국', TW: '대만', HK: '홍콩', VN: '베트남', TH: '태국', RU: '러시아', SG: '싱가포르',
  MY: '말레이시아', ID: '인도네시아', PH: '필리핀', AU: '호주', GB: '영국', CA: '캐나다', DE: '독일', FR: '프랑스', AE: 'UAE', SA: '사우디',
  KZ: '카자흐스탄', MN: '몽골', IN: '인도', MO: '마카오', '??': '미상',
};

export default async function MasterAnalyticsPage({ searchParams }: { searchParams: { range?: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const r = resolveRange(searchParams.range);

  const [
    cur, prev, byMonth, byDay, byHour, byCountry, byDevice, byLocale, referrers, pages, posts, firstAt,
    signupsCur, signupsPrev, signupsDay, signupsMonth, signupsProv, signupsLoc, recent, orders, ordersPrev,
  ] = await Promise.all([
    trafficTotals(r.from, r.to), trafficTotals(r.prevFrom, r.prevTo),
    trafficByMonth(), trafficByDay(r.from, r.to), trafficByHour(r.from, r.to),
    trafficByCountry(r.from, r.to), trafficByDevice(r.from, r.to), trafficByLocale(r.from, r.to),
    topReferrers(r.from, r.to), topPages(r.from, r.to, 15), topPages(r.from, r.to, 15, true), firstViewAt(),
    signupTotals(r.from, r.to), signupTotals(r.prevFrom, r.prevTo),
    signupsByDay(r.from, r.to), signupsByMonth(), signupsByProvider(r.from, r.to), signupsByLocale(r.from, r.to),
    recentSignups(20), orderSummary(r.from, r.to), orderSummary(r.prevFrom, r.prevTo),
  ]);

  const rangeLabel = PRESETS.find((p) => p.key === r.preset)?.label ?? '';
  const collecting = firstAt ? `${fmtDate(firstAt)}부터 수집` : '아직 수집된 방문이 없습니다 — 배포 직후부터 쌓입니다';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">통계 리포트</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            트래픽 · 신규 가입 · 인기 게시물 · 결제. 방문 데이터는 {collecting}. 시각은 모두 서울 기준.
          </p>
        </div>
        <Link href="/master" className="text-xs underline">마스터 홈</Link>
      </header>

      {/* 필터 한 줄 — 아래 전부가 이 구간을 본다 */}
      <nav className="mb-6 flex flex-wrap items-center gap-1" aria-label="기간">
        {PRESETS.map((p) => {
          const active = p.key === r.preset;
          return (
            <Link
              key={p.key}
              href={`/master/analytics?range=${p.key}`}
              className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-foreground bg-foreground font-semibold text-background' : 'text-muted-foreground hover:bg-muted'}`}
              aria-current={active ? 'page' : undefined}
            >
              {active ? '✓ ' : ''}{p.label}
            </Link>
          );
        })}
        <span className="ml-2 text-[11px] text-muted-foreground">{fmtDate(r.from)} ~ {fmtDate(r.to)} · 증감은 직전 {r.days}일 대비</span>
      </nav>

      {/* KPI 한 줄 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="방문 (세션)" value={cur.sessions} prev={prev.sessions} />
        <Stat label="페이지뷰" value={cur.views} prev={prev.views} />
        <Stat label="신규 가입" value={signupsCur} prev={signupsPrev} />
        <Stat label="결제 완료 주문" value={orders.paid} prev={ordersPrev.paid} />
        <Stat label="결제 금액" value={orders.paidWon} prev={ordersPrev.paidWon} won />
      </div>

      {/* 트래픽 추이 */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="pt-5">
          <BarChart title="월별 페이지뷰 (최근 12개월)" unit="페이지뷰" subUnit="방문" points={byMonth.map((b) => ({ label: b.label, value: b.views, sub: b.sessions }))} />
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <BarChart title={`일별 페이지뷰 (${rangeLabel})`} unit="페이지뷰" subUnit="방문" points={byDay.map((b) => ({ label: b.label, value: b.views, sub: b.sessions }))} />
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <BarChart title={`시간대별 페이지뷰 (${rangeLabel} 합계, 서울)`} unit="페이지뷰" subUnit="방문" points={byHour.map((b) => ({ label: b.label, value: b.views, sub: b.sessions }))} />
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <BarChart title={`일별 신규 가입 (${rangeLabel})`} unit="가입" points={signupsDay.map((b) => ({ label: b.label, value: b.views }))} />
        </CardContent></Card>
      </section>

      {/* 나라 · 기기 · 언어 · 유입 */}
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">나라별 방문 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent>
            {byCountry.length === 0 ? <Empty /> : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">나라</th><th className="py-1 text-right font-medium">페이지뷰</th><th className="py-1 text-right font-medium">방문</th><th className="py-1 text-right font-medium">비중</th></tr></thead>
                <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {byCountry.map((c) => (
                    <tr key={c.country} className="border-t">
                      <td className="py-1">
                        <span className="mr-1 font-mono text-[11px] text-muted-foreground">{c.country}</span>{COUNTRY_KO[c.country] ?? ''}
                      </td>
                      <td className="py-1 text-right">{c.views.toLocaleString('ko-KR')}</td>
                      <td className="py-1 text-right">{c.sessions.toLocaleString('ko-KR')}</td>
                      <td className="py-1 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-1.5 rounded-sm" style={{ width: `${Math.max(2, Math.round(c.share * 60))}px`, background: 'var(--series-1)' }} />
                          {(c.share * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">기기 · 언어 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SplitTable title="기기" rows={byDevice.map((d) => ({ key: d.key === 'mobile' ? '모바일' : d.key === 'desktop' ? '데스크톱' : d.key, views: d.views, sessions: d.sessions }))} />
            <SplitTable title="사이트 언어" rows={byLocale.map((d) => ({ key: d.key, views: d.views, sessions: d.sessions }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">유입 경로 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent>
            {referrers.length === 0 ? <Empty note="직접 접속·북마크·앱 내 이동은 유입 경로가 남지 않습니다." /> : (
              <SplitTable title="외부 사이트" rows={referrers.map((d) => ({ key: d.key, views: d.views, sessions: d.sessions }))} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* 인기 게시물 · 인기 페이지 */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">클릭 많은 게시물 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent>
            {posts.length === 0 ? <Empty /> : <PagesTable rows={posts} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">인기 페이지 전체 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent>
            {pages.length === 0 ? <Empty /> : <PagesTable rows={pages} />}
          </CardContent>
        </Card>
      </section>

      {/* 신규 가입 */}
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">가입 경로 · 언어 ({rangeLabel})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SplitTable title="가입 방법" rows={signupsProv.map((d) => ({ key: PROVIDER_KO[d.key] ?? d.key, views: d.views, sessions: d.sessions }))} single />
            <SplitTable title="가입 시 언어" rows={signupsLoc.map((d) => ({ key: d.key, views: d.views, sessions: d.sessions }))} single />
            <div>
              <BarChart title="월별 신규 가입 (최근 12개월)" unit="가입" points={signupsMonth.map((b) => ({ label: b.label, value: b.views }))} height={140} />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">최근 가입 20명 <Link href="/master/members" className="ml-2 text-[11px] font-normal underline">전체 회원 리스트</Link></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">가입일</th><th className="py-1 text-left font-medium">이메일</th><th className="py-1 text-left font-medium">이름</th><th className="py-1 text-left font-medium">방법</th><th className="py-1 text-left font-medium">언어</th><th className="py-1 text-left font-medium">국가</th><th className="py-1 text-left font-medium">출처</th></tr></thead>
                <tbody>
                  {recent.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="whitespace-nowrap py-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(u.createdAt)}</td>
                      <td className="py-1 break-all">{u.email ?? '—'}</td>
                      <td className="py-1">{u.name ?? '—'}</td>
                      <td className="py-1">{PROVIDER_KO[u.provider] ?? u.provider}</td>
                      <td className="py-1">{u.locale ?? '—'}</td>
                      <td className="py-1">{u.country ?? '—'}</td>
                      <td className="py-1 text-muted-foreground">{u.source === 'patient_portal' ? '일반' : u.source === 'partner_center' ? 'BIZ' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 결제 */}
      <section className="mb-10">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">예약 · 결제 ({rangeLabel}) <Link href="/master/orders" className="ml-2 text-[11px] font-normal underline">예약 인보이스</Link></CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <Mini label="발행" value={orders.issued} />
              <Mini label="입금 신고" value={orders.reported} />
              <Mini label="결제 완료" value={orders.paid} />
              <Mini label="취소" value={orders.cancelled} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─── 조각들 ──────────────────────────────────────────────────────────

function Stat({ label, value, prev, won }: { label: string; value: number; prev: number; won?: boolean }): JSX.Element {
  const delta = prev > 0 ? (value - prev) / prev : null;
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{won ? `₩${value.toLocaleString('ko-KR')}` : value.toLocaleString('ko-KR')}</div>
        <div className="mt-1 text-[11px]" style={{ color: up ? 'var(--delta-up)' : down ? 'var(--ink-2)' : 'var(--ink-3)' }}>
          {delta === null ? (prev === 0 && value > 0 ? '▲ 신규' : '직전 구간 데이터 없음') : `${up ? '▲' : down ? '▼' : '—'} ${Math.abs(delta * 100).toFixed(0)}% (직전 ${won ? `₩${prev.toLocaleString('ko-KR')}` : prev.toLocaleString('ko-KR')})`}
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value.toLocaleString('ko-KR')}</div>
    </div>
  );
}

function SplitTable({ title, rows, single }: { title: string; rows: Array<{ key: string; views: number; sessions: number }>; single?: boolean }): JSX.Element {
  const total = rows.reduce((a, r) => a + r.views, 0) || 1;
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-muted-foreground">{title}</div>
      {rows.length === 0 ? <Empty /> : (
        <table className="w-full text-xs">
          <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
            {rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="py-1">{r.key}</td>
                <td className="py-1 text-right">{r.views.toLocaleString('ko-KR')}{single ? '' : ` / ${r.sessions.toLocaleString('ko-KR')}`}</td>
                <td className="w-16 py-1 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 rounded-sm" style={{ width: `${Math.max(2, Math.round((r.views / total) * 40))}px`, background: 'var(--series-1)' }} />
                    {Math.round((r.views / total) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!single && rows.length > 0 ? <div className="mt-1 text-[10px] text-muted-foreground">페이지뷰 / 방문</div> : null}
    </div>
  );
}

function PagesTable({ rows }: { rows: Array<{ path: string; kind: string; views: number; sessions: number }> }): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">경로</th><th className="py-1 text-left font-medium">종류</th><th className="py-1 text-right font-medium">조회</th><th className="py-1 text-right font-medium">방문</th></tr></thead>
      <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
        {rows.map((p) => (
          <tr key={p.path} className="border-t">
            <td className="max-w-[260px] truncate py-1"><a href={`https://www.glowuptour.com${p.path}`} target="_blank" rel="noopener noreferrer" className="hover:underline" title={p.path}>{p.path}</a></td>
            <td className="whitespace-nowrap py-1 text-muted-foreground">{p.kind || classifyPath(p.path)}</td>
            <td className="py-1 text-right">{p.views.toLocaleString('ko-KR')}</td>
            <td className="py-1 text-right">{p.sessions.toLocaleString('ko-KR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ note }: { note?: string }): JSX.Element {
  return <p className="py-3 text-xs text-muted-foreground">{note ?? '이 구간에는 데이터가 없습니다.'}</p>;
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit' }).format(d);
}
function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}

/** 차트 색 토큰 — 참조 팔레트(1번 슬롯 파랑). 다크는 OS 설정과 data-theme 둘 다 따른다. */
const VIZ_CSS = `
.viz-root{--surface-1:#fcfcfb;--ink-1:#0b0b0b;--ink-2:#52514e;--ink-3:#898781;--grid:#e1e0d9;--axis:#c3c2b7;--hairline:rgba(11,11,11,0.10);--series-1:#2a78d6}
:root{--delta-up:#006300}
@media (prefers-color-scheme: dark){:root:where(:not([data-theme="light"])) .viz-root{--surface-1:#1a1a19;--ink-1:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--grid:#2c2c2a;--axis:#383835;--hairline:rgba(255,255,255,0.10);--series-1:#3987e5}:root:where(:not([data-theme="light"])){--delta-up:#0ca30c}}
:root[data-theme="dark"] .viz-root{--surface-1:#1a1a19;--ink-1:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--grid:#2c2c2a;--axis:#383835;--hairline:rgba(255,255,255,0.10);--series-1:#3987e5}
:root[data-theme="dark"]{--delta-up:#0ca30c}
`;
