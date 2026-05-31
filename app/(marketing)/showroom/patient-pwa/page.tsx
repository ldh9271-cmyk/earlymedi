import Link from 'next/link';
import {
  Calendar,
  CreditCard,
  FileText,
  HeartPulse,
  MessageCircle,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';

export const metadata = { title: '환자 PWA 디자인 쇼룸' };

/**
 * Patient PWA — magic-link entry, no Supabase Auth account row.
 * Each of these tiles links to a stand-alone module under /(patient-app)/.
 * The 9 languages list comes from the brand spec.
 */

const TILES = [
  {
    icon: Calendar,
    href: '#schedule',
    title: '일정',
    body: '시술일 · 회복 D+N · 호텔 체크인/아웃 · 항공편',
    badge: 'D-3 시술',
    badgeVariant: 'brand' as const,
  },
  {
    icon: MessageCircle,
    href: '#messages',
    title: '메시지',
    body: '에이전시 매니저 · 통역사 · 회복 코디',
    badge: '2 new',
    badgeVariant: 'hospitality' as const,
  },
  {
    icon: CreditCard,
    href: '#payments',
    title: '결제',
    body: '예약금 영수증 · 잔금 · 환불 · 다국적 결제',
    badge: '잔금 ₩7.0M',
    badgeVariant: 'care' as const,
  },
  {
    icon: FileText,
    href: '#chart',
    title: '시술 차트',
    body: '병원 작성 → 에이전시 검증 → 본인 서명',
    badge: 'D+7 finalize',
    badgeVariant: 'brand' as const,
  },
  {
    icon: HeartPulse,
    href: '#recovery',
    title: 'GlowCare 회복',
    body: '사진·통증 체크인 · 의사 메시지 · 화상 재진',
    badge: 'D+3 사진',
    badgeVariant: 'care' as const,
  },
  {
    icon: Phone,
    href: '#sos',
    title: 'SOS',
    body: '24/7 긴급 연락 · 가까운 응급실 안내',
    badge: 'always-on',
    badgeVariant: 'destructive' as const,
  },
];

const LANGUAGES = ['한국어', 'English', '中文(简)', '中文(繁)', '日本語', 'Tiếng Việt', 'ภาษาไทย', 'العربية', 'Русский'];

export default function ShowroomPatientPwaPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="mb-6 inline-flex items-center rounded-full bg-foreground px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-background">
        Design Showroom · Patient PWA · 9개 언어
      </div>

      <header className="mb-8 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          환자 전용 인터페이스
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-[40px] md:leading-[1.1]">
          왕샤오밍님의 의료관광 여정
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          매직링크로만 접근 가능합니다. 에이전시와 분리된 단순 인터페이스로 환자가 일정·결제·차트·회복을 한 손에서 확인합니다.
        </p>
      </header>

      <section className="mb-8 rounded-[32px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-8 text-white shadow-[0_0_22px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              현재 단계 · 시술 D-3
            </div>
            <div className="mt-3 text-3xl font-bold leading-tight md:text-4xl">코재수술 · KoreaGlowUp 데모 성형외과</div>
            <div className="mt-1 text-sm text-white/80">2026-06-10 입국 · 2026-06-20 출국 · C-3-3 비자 승인</div>
          </div>
          <Button className="rounded-full bg-white text-brand-700 hover:bg-white/90">전체 일정 보기</Button>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.title}
              href={t.href}
              className="group block rounded-3xl border bg-card p-5 transition hover:border-foreground/30"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <Badge variant={t.badgeVariant}>{t.badge}</Badge>
              </div>
              <div className="text-base font-semibold">{t.title}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">{t.body}</div>
            </Link>
          );
        })}
      </section>

      <section className="mb-8 rounded-3xl border bg-card p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">언어 선택</h2>
          <Badge variant="secondary" className="rounded-full">9개 언어</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l, i) => (
            <button
              key={l}
              type="button"
              className={
                i === 2
                  ? 'inline-flex items-center rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                  : 'inline-flex items-center rounded-full border px-3 py-1 text-xs text-foreground transition hover:bg-muted'
              }
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시술 차트 공유 (D+7 finalize 대기)</CardTitle>
            <CardDescription>병원 작성 → 에이전시 검증 → 환자 서명. 현재 단계는 에이전시 검토 중.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Badge variant="care">완료</Badge>
                <span>병원 작성 · 2026-06-13 14:20</span>
              </li>
              <li className="flex items-center gap-3">
                <Badge variant="brand">진행 중</Badge>
                <span>에이전시 검증 · 김유치 매니저</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Badge variant="secondary">대기</Badge>
                <span>환자 본인 서명</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Badge variant="secondary">대기</Badge>
                <span>finalize · 정산 트리거</span>
              </li>
            </ol>
            <div className="mt-4 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              공개 범위는 <span className="font-semibold">name_and_amount</span> — 시술명과 라인 합계가 보이고 병원 송객 수수료는 비공개.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">회복 체크인 (오늘)</CardTitle>
            <CardDescription>환자 현지(서울) 시각 10:00 자동 발송. 응답이 24시간 없으면 의사에게 자동 에스컬레이션.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">D+3 통증 체크</span>
                  <Badge variant="hospitality">응답 필요</Badge>
                </div>
                <div className="mb-3 text-xs text-muted-foreground">0(없음) → 10(극심) 사이로 선택해 주세요.</div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={
                        i === 3
                          ? 'h-9 w-9 rounded-full bg-foreground text-xs font-semibold text-background'
                          : 'h-9 w-9 rounded-full border text-xs text-foreground hover:bg-muted'
                      }
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-1 text-sm font-semibold">D+3 회복 사진</div>
                <div className="mb-3 text-xs text-muted-foreground">정면·측면 각 1장. AI가 이상 신호(부기·발적·비대칭) 자동 감지.</div>
                <Button variant="brand" className="rounded-full">
                  카메라 열기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="pt-4 text-[11px] text-muted-foreground">
        매직링크 인증 — 환자 계정 없음. 모든 보기는 audit_logs에 patient_role로 기록.
      </div>
    </div>
  );
}
