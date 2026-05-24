import Link from 'next/link';
import { SiteNav } from '@/components/shared/layout/site-nav';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bot,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe2,
  HeartPulse,
  History,
  Inbox,
  KeyRound,
  Languages,
  MapPin,
  MessageSquareText,
  Mic,
  Plane,
  Receipt,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Undo2,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <ActorMatrix />
      <ChannelBand />
      <FeatureGroup
        eyebrow="환자 접점 통합 · 14"
        title="환자 한 명의 모든 접점을 하나로"
        lead="첫 문의 → 견적 → 결제 → 시술 → 사후관리까지. 채널·언어·통화·시간대가 달라도 케이스 1건으로 합쳐집니다."
        items={PATIENT_CONTACT_FEATURES}
        variant="brand"
      />
      <FeatureGroup
        eyebrow="AI 자동화 · 13"
        title="상담사 업무를 AI가 보조"
        lead="Gemini 2.5 Pro 메인 + Claude Opus 4.7 폴백. 가명화로 환자 PII는 모델에 안 닿게."
        items={AI_FEATURES}
        variant="hospitality"
      />
      <FeatureGroup
        eyebrow="안전 · 컴플라이언스 · 9"
        title="의료기관 SaaS 운영에 필수인 안전 장치"
        lead="의료법 27조의2 · 외국인환자 유치업 등록 의무 · PHI 10년 보존 모두 시스템이 강제합니다."
        items={SAFETY_FEATURES}
        variant="care"
      />
      <PricingBand />
      <DesignShowroomCard />
      <FinalCta />
      <Footer />
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────

function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-background">
            <Sparkles className="h-3 w-3" />
            한국 보건복지부 등록 외국인환자 유치업자 전용
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            환자의 첫 문의부터
            <br className="hidden sm:inline" />
            귀국 후 케어까지,
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-brand-600 via-hospitality-500 to-care-500 bg-clip-text text-transparent">
              한 손에서 끝나는 의료관광
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            10개 채널 다국어 상담, AI 차트 자동화는 물론{' '}
            <span className="font-medium text-foreground">의료기관과 에이전시의 매칭·정산</span>까지 한 번에 해결하는 올인원 플랫폼입니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90"
            >
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/showroom/insights"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted"
            >
              데모 둘러보기 (인증 없이)
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-care-600" /> 신용카드 없이 14일 무료
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-care-600" /> 의료법 27조의2 자동 준수
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-care-600" /> Gemini 2.5 Pro + Claude Opus 4.7
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Actor matrix — EarlyMedi unique identity
// ─────────────────────────────────────────────────────────

const ACTORS = [
  {
    href: '/signup',
    icon: Stethoscope,
    name: '의료기관',
    en: 'Medical',
    body: '견적·진료·시술 차트. AI 차트 자동 채움 + 송객 수수료 자동 계산.',
    accent: 'care' as const,
    badge: '병원',
  },
  {
    href: '/signup',
    icon: ClipboardList,
    name: '유치업체',
    en: 'Agency',
    body: '모객·매칭·결제·정산·비자·사후관리 본체. 의료관광를 묶는 허브.',
    accent: 'brand' as const,
    badge: '핵심',
  },
  {
    href: '/signup',
    icon: MapPin,
    name: '파트너업체',
    en: 'Non-medical',
    body: '호텔·스파·식당·교통·관광. 시술 후 제약 자동 충돌 감지.',
    accent: 'slate' as const,
    badge: '여정',
  },
  {
    href: '/signup',
    icon: Users,
    name: '프리랜서',
    en: 'Freelancer',
    body: '송객·통역·코디·인플루언서. 다중 에이전시 겸업 + QR 추천 코드.',
    accent: 'hospitality' as const,
    badge: '송객자',
  },
];

function ActorMatrix(): JSX.Element {
  return (
    <section id="actors" className="border-b">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <SectionHead
          eyebrow="의료관광 · One Platform"
          title="역할이 다른 의료관광 파트너가 같은 케이스에서 협업"
          lead="각 액터는 자기 데이터만 보고, 계약으로 연결된 다른 액터의 데이터는 명시적 공개 범위에서만 봅니다."
        />
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ACTORS.map((a) => {
            const Icon = a.icon;
            const accentClass =
              a.accent === 'brand'
                ? 'from-brand-600 via-brand-700 to-brand-900'
                : a.accent === 'care'
                  ? 'from-care-500 via-care-600 to-care-800'
                  : a.accent === 'hospitality'
                    ? 'from-hospitality-500 via-hospitality-600 to-hospitality-700'
                    : 'from-slate-700 via-slate-800 to-slate-950';
            return (
              <Link
                key={a.name}
                href={a.href}
                className={`group relative overflow-hidden rounded-[32px] bg-gradient-to-br p-6 text-white shadow-[0_0_22px_rgba(0,0,0,0.08)] transition hover:scale-[1.02] ${accentClass}`}
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    {a.badge}
                  </span>
                </div>
                <div className="mt-6 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-white/70">{a.en}</div>
                  <div className="text-2xl font-bold">{a.name}</div>
                  <p className="text-sm text-white/80">{a.body}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold">
                  가입 위저드 <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Channel band
// ─────────────────────────────────────────────────────────

const CHANNELS = [
  { label: 'KakaoTalk', emoji: '💬' },
  { label: 'WhatsApp', emoji: '🟢' },
  { label: 'LINE', emoji: '💚' },
  { label: 'WeChat', emoji: '🐉' },
  { label: 'Instagram', emoji: '📷' },
  { label: 'Telegram', emoji: '✈️' },
  { label: 'Messenger', emoji: '💙' },
  { label: 'SMS', emoji: '✉️' },
  { label: 'Email', emoji: '📧' },
  { label: 'Web Chat', emoji: '🌐' },
];

function ChannelBand(): JSX.Element {
  return (
    <section id="features" className="border-b bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">10채널 다국어 통합 인박스</h2>
          <span className="text-xs text-muted-foreground">3-pane · 자동 번역 · Lead 자동 승격 · ⌘K 단축키</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm"
            >
              <span aria-hidden>{c.emoji}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Feature groups
// ─────────────────────────────────────────────────────────

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tag?: string;
};

const PATIENT_CONTACT_FEATURES: Feature[] = [
  { icon: Inbox, title: '10채널 다국어 인박스', body: '카카오·LINE·WhatsApp·WeChat·인스타 등 한 화면에서 응대 + 원문/한국어 병기.' },
  { icon: ClipboardList, title: '리드 자동 승격', body: 'Lead → Qualified → Case → Quoted → Booked 단계 AI가 자동 분류·승급.' },
  { icon: BadgeCheck, title: '여권 OCR 환자 등록', body: 'ICAO 9303 MRZ 우선 판독 + VIZ 교차 검증으로 PII 자동 입력.' },
  { icon: HeartPulse, title: '환자 CRM · 의료 히스토리', body: '알레르기·복용약·과거 시술·임신/수유. 중복 환자 자동 머지.' },
  { icon: FileText, title: 'RFQ → 견적 비교표', body: '여러 병원에 동시 발송, 견적 회신을 자동 비교표로.' },
  { icon: ClipboardCheck, title: '시술 차트 3단 워크플로우', body: '병원 작성 → 에이전시 검증 → 환자 서명 → finalize → 정산.', tag: '핵심' },
  { icon: CalendarRange, title: '의료관광 패키지 빌더', body: '시술 + 회복일 + 호텔 + 항공 + 관광 자동 조합. 시술 후 제약 자동 충돌 감지.' },
  { icon: Plane, title: '메디컬 비자 (C-3-3 / G-1-10)', body: '초청장 자동 PDF + 카테고리별 체류일 검증 + D-30..D+3 출입국 알림.' },
  { icon: HeartPulse, title: 'EarlyCare D+N 사후관리', body: '시술별 D+1/3/7/14/30/90/180/365. 환자 현지 10:00 자동 발송.' },
  { icon: ScanLine, title: '사진 회복 모니터링', body: '환자 사진 → AI 부기·발적·비대칭 감지 → 의사 자동 에스컬레이션.' },
  { icon: Mic, title: '화상 재진 + 통역사 매칭', body: 'Zoom · Daily.co 화상 재진. 환자 모국어 통역사 자동 우선 매칭.' },
  { icon: Globe2, title: '환자 PWA · 9개 언어', body: '한·영·중간/번·일·베·태·아·러. 매직링크로만 접근, 별도 계정 불필요.' },
  { icon: MapPin, title: '체류 환자 지도', body: 'Mapbox 기반 체류 위치·이동 동선 + 시술 일정 캘린더 동기화.' },
  { icon: MessageSquareText, title: '환자 동의서 (다국어·분리)', body: '의료정보 위탁 · 국외 이전 · 마케팅 수신 항목별 분리 동의.' },
];

const AI_FEATURES: Feature[] = [
  { icon: Bot, title: '답변 추천 3톤 스트리밍', body: '간결·친절·럭셔리 — Gemini 2.5 Pro 스트리밍, 실패 시 Claude Opus 4.7 폴백.' },
  { icon: Languages, title: '실시간 번역 + 의료 용어 사전', body: '병원별 용어집 학습 — 같은 용어가 일관되게 번역됩니다.' },
  { icon: Sparkles, title: '의도 · 감정 · 긴급도 분류', body: '메디컬/관광 이중 분류 + 긴급도 critical/warning/info 자동 라우팅.' },
  { icon: ClipboardCheck, title: 'AI 시술 차트 자동 채움', body: '사진·PDF·텍스트·음성·메신저 전달본 → zod 강제 스키마 + 신뢰도 점수.', tag: '핵심' },
  { icon: ScanLine, title: '여권 / 영수증 / 견적 추출', body: '공통 추출 엔진 — 새 스키마 + 프롬프트만 추가하면 즉시 작동.' },
  { icon: ShieldCheck, title: 'PII 가명화', body: 'AI 호출 전 환자 이름·전화·여권 마스킹, 응답 복원 — 모델은 PII에 닿지 않음.' },
  { icon: Wallet, title: '병원 송객 수수료 자동 계산', body: '성형 30% · 피부 20% · 모발 25% · 치과 15% — 시술/카테고리/기본 정책 우선순위 + VIP·재방문·누진.' },
  { icon: Receipt, title: 'VAT 자동 분할', body: '의료 면세 + 미용 과세 + 혼합 라인 자동 분할 (line-level).' },
  { icon: CreditCard, title: '예약금 환불 자동 분배', body: 'D-30 100% · D-14 70% · D-7 50% · D-3 0% + 의료/천재 전액 환불 + 분할 분배.' },
  { icon: Banknote, title: '프리랜서 커미션 + 원천세', body: 'case > 개인 > 카테고리 > 조직 우선순위 + KR 3.3% / 조세조약 자동.' },
  { icon: ClipboardList, title: 'RAG 가격 챗봇', body: '병원 가격표 PDF 업로드 → 환자 질문에 시술별 가격 자동 응답.' },
  { icon: MessageSquareText, title: '금칙어 · 리스크 감지', body: '소송·환불·고소 등 키워드 — 매니저에게 즉시 알림.' },
  { icon: Mic, title: '음성 → 텍스트 (다국어)', body: '환자 음성 메모 → 자동 전사 + 번역 + 차트 자동 채움 입력.' },
];

const SAFETY_FEATURES: Feature[] = [
  { icon: ShieldCheck, title: '5단 권한 미들웨어', body: '인증 → 활성 조직 → 멤버십 → URL ↔ account_type → RLS 5단계 자동 강제.' },
  { icon: Database, title: 'Postgres RLS', body: 'organization_id 격리 + 의료관광 분리 + 명시 계약된 cross-org 가시성만 허용.' },
  { icon: KeyRound, title: 'pgcrypto 환자 PII 암호화', body: '여권·전화·이메일·외국인등록번호 컬럼 암호화 + reveal_pii 모든 호출 감사.' },
  { icon: History, title: '10년 PHI 감사 로그', body: '의료법 27조의2 — 모든 진료기록·차트·결제 변경 audit_logs에 영구 기록.' },
  { icon: FileSpreadsheet, title: 'KOIHA 분기 통계 CSV', body: '의료법 시행규칙 제19조의2 — 분기 자동 집계 + 보건복지부 양식 CSV.' },
  { icon: ShieldCheck, title: '의료법 27조의2 광고 검사', body: '비교·과장·후기 단정·할인 조건 누락 등 자동 헤이리스틱 + 중·일·미 가이드.' },
  { icon: Undo2, title: '휴지통 · 30일 복원', body: '삭제는 즉시 hard delete가 아니라 30일 grace period. 복원 가능.' },
  { icon: UserCog, title: '역할별 권한 (5단계)', body: 'owner · admin · manager · member · viewer — 좌석 단위 청구 + 좌석 초과 잠금.' },
  { icon: Gauge, title: '사용량 메터링 + 제한 단계', body: 'past_due → restricted → suspended 단계 자동 적용 + 충전 잔액 임계 알림.' },
];

function FeatureGroup({
  eyebrow,
  title,
  lead,
  items,
  variant,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  items: Feature[];
  variant: 'brand' | 'hospitality' | 'care';
}): JSX.Element {
  const iconBg =
    variant === 'brand' ? 'bg-brand-50 text-brand-700' : variant === 'hospitality' ? 'bg-hospitality-50 text-hospitality-700' : 'bg-care-50 text-care-700';
  return (
    <section className="border-b">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <SectionHead eyebrow={eyebrow} title={title} lead={lead} variant={variant} />
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className="group relative rounded-2xl border bg-card p-5 transition hover:border-foreground/30"
              >
                {f.tag ? (
                  <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                    {f.tag}
                  </span>
                ) : null}
                <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
  variant,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  variant?: 'brand' | 'hospitality' | 'care';
}): JSX.Element {
  const eyebrowColor =
    variant === 'hospitality'
      ? 'text-hospitality-700'
      : variant === 'care'
        ? 'text-care-700'
        : 'text-brand-700';
  return (
    <div className="max-w-3xl">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowColor}`}>
        {eyebrow}
      </div>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-2 text-balance text-sm text-muted-foreground md:text-base">{lead}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Pricing teaser
// ─────────────────────────────────────────────────────────

function PricingBand(): JSX.Element {
  return (
    <section className="border-b bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <SectionHead
          eyebrow="요금제"
          title="의료관광, 4 가지 요금 정책"
          lead="유치업체는 3-tier 구독 · 의료기관은 충전식 · 비의료는 마켓플레이스 수수료 · 프리랜서는 무료."
        />
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PriceCard color="brand" name="유치업체" sub="Starter / Growth / Pro" price="₩99K~699K / 월" extra="14일 무료 체험" />
          <PriceCard color="care" name="의료기관" sub="Pay-as-you-go / Committed" price="₩500K부터 충전" extra="등록비 ₩300K" />
          <PriceCard color="slate" name="파트너업체" sub="Listing / Active" price="₩50K + GMV 3% / 1.5%" extra="가입비 ₩50K" />
          <PriceCard color="hospitality" name="프리랜서" sub="Free" price="무료" extra="Agency 좌석에 포함" />
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-xs font-semibold transition hover:bg-muted"
          >
            요금제 자세히 보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  color,
  name,
  sub,
  price,
  extra,
}: {
  color: 'brand' | 'care' | 'hospitality' | 'slate';
  name: string;
  sub: string;
  price: string;
  extra: string;
}): JSX.Element {
  const accent = {
    brand: 'text-brand-700',
    care: 'text-care-700',
    hospitality: 'text-hospitality-700',
    slate: 'text-foreground',
  }[color];
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      <div className="mt-4 text-xl font-bold">{price}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{extra}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Design showroom card
// ─────────────────────────────────────────────────────────

function DesignShowroomCard(): JSX.Element {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="rounded-[32px] bg-foreground p-8 text-background md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/60">
                인증 없이 미리보기
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">설치 없이 모든 핵심 화면을 데모로</h2>
              <p className="text-sm text-background/70">
                의료관광 설정 · EarlyInsight 분석 · 의료법 27조의2 컴플라이언스 · 환자 PWA — Supabase 연결 없이 컴포넌트 시각화.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShowroomLink href="/showroom/settings">에이전시 설정</ShowroomLink>
              <ShowroomLink href="/showroom/settings/medical">의료기관 설정</ShowroomLink>
              <ShowroomLink href="/showroom/settings/freelancer">프리랜서 설정</ShowroomLink>
              <ShowroomLink href="/showroom/settings/partner">파트너 설정</ShowroomLink>
              <ShowroomLink href="/showroom/insights">EarlyInsight 분석</ShowroomLink>
              <ShowroomLink href="/showroom/compliance">컴플라이언스</ShowroomLink>
              <ShowroomLink href="/showroom/patient-pwa">환자 PWA</ShowroomLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowroomLink({ href, children }: { href: string; children: React.ReactNode }): JSX.Element {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-background/10 px-3 py-1.5 text-xs font-medium text-background transition hover:bg-background/20"
    >
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────────────────

function FinalCta(): JSX.Element {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
          14일 무료. 신용카드 없이 시작.
        </h2>
        <p className="mt-3 text-balance text-sm text-muted-foreground md:text-base">
          이메일·구글로 30초 가입 → 환자 10명까지 무료. 11명째부터 유료 전환.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90"
          >
            무료로 10명 시작 <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted"
          >
            기존 계정 로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────

function Footer(): JSX.Element {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-xs text-muted-foreground">
        <div className="space-y-1">
          <div className="text-foreground">
            <span className="font-extrabold text-brand-600">Early</span>
            <span className="font-semibold">Medi</span>{' '}
            <span className="text-hospitality-500">AI Concierge</span>
          </div>
          <div>© {new Date().getFullYear()} EarlyMedi · 의료법 27조의2 외국인환자 유치 광고 가이드라인 준수</div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/legal/privacy" className="hover:text-foreground">개인정보처리방침</Link>
          <Link href="/legal/terms" className="hover:text-foreground">이용약관</Link>
          <Link href="/legal/medical-ad" className="hover:text-foreground">의료광고 가이드</Link>
          <a href="mailto:hello@earlymedi.com" className="hover:text-foreground">문의</a>
        </nav>
      </div>
    </footer>
  );
}
