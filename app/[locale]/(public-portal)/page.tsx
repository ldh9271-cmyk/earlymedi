import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Languages,
  Wallet,
  Heart,
  Pill,
  Smile,
  User,
  Activity,
  MapPin,
  Scissors,
  Camera,
  Check,
} from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

export default async function PublicLandingPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const { locale } = params;
  return (
    <>
      <Hero locale={locale} dict={dict} />
      <Categories locale={locale} dict={dict} />
      <AiTeaser locale={locale} dict={dict} />
      <TrustGrid dict={dict} />
      <InquiryCta locale={locale} dict={dict} />
    </>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────

function Hero({ locale, dict }: { locale: PublicLocale; dict: Dictionary }): JSX.Element {
  const stats = [
    { value: '120+', label: dict.hero.stats.hospitals },
    { value: '8', label: dict.hero.stats.procedures },
    { value: '3,200', label: dict.hero.stats.patients },
    { value: '5', label: dict.hero.stats.languages },
  ];
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-background to-hospitality-50">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:pb-24 lg:pt-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
              <Sparkles className="h-3 w-3" />
              {dict.hero.badge}
            </div>
            <h1 className="whitespace-pre-line text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {dict.hero.title}
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              {dict.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/ai-consult`}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Sparkles className="h-4 w-4" />
                {dict.hero.ctaPrimary}
              </Link>
              <Link
                href={`/${locale}/clinics`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {dict.hero.ctaSecondary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <dl className="grid max-w-md grid-cols-4 gap-4 pt-4">
              {stats.map((s) => (
                <div key={s.label} className="text-left">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero visual — abstract panel preview. Keep CSS-only to
              avoid heavy image dependencies on the landing critical path. */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-brand-200/40 to-hospitality-200/40 blur-3xl" />
            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive/60" />
                <div className="h-2 w-2 rounded-full bg-hospitality-400" />
                <div className="h-2 w-2 rounded-full bg-care-400" />
                <span className="ml-2 text-xs text-muted-foreground">AI Consultation</span>
              </div>
              <ChatBubble side="left" tint="muted">
                {locale === 'kr'
                  ? '코 성형을 고민중인데, 자연스럽게 하고 싶어요.'
                  : locale === 'zh'
                    ? '想做鼻整形，希望自然一点。'
                    : locale === 'ja'
                      ? '鼻整形を考えていますが、自然な感じにしたいです。'
                      : "I'm thinking about rhinoplasty, but I want it to look natural."}
              </ChatBubble>
              <ChatBubble side="right" tint="brand">
                {locale === 'kr'
                  ? '자연스러운 코끝 라인을 살리는 시술과, 회복기간이 짧은 비절개 방식 3곳을 추천드릴게요.'
                  : locale === 'zh'
                    ? '为您推荐3家擅长自然鼻尖线条、非切开式恢复期短的医院。'
                    : locale === 'ja'
                      ? '自然な鼻先ラインを活かせる非切開式・回復期間が短い病院を3つご紹介します。'
                      : "I'll recommend 3 clinics specialized in natural-looking, short-recovery non-incision rhinoplasty."}
              </ChatBubble>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['강남성형외과', '서울뷰티의원', '클리닉K'].map((name) => (
                  <div
                    key={name}
                    className="rounded-lg border bg-muted/30 p-2 text-center text-[10px] font-medium"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({
  children,
  side,
  tint,
}: {
  children: React.ReactNode;
  side: 'left' | 'right';
  tint: 'brand' | 'muted';
}): JSX.Element {
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          tint === 'brand'
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md border bg-card text-foreground'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Categories ────────────────────────────────────────────────────

function Categories({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary;
}): JSX.Element {
  // Order matters — these are shown in a 4-column grid on desktop, 2-col
  // on tablet, 1-col on mobile. Keep the most-requested categories
  // (성형외과, 피부과) at the start of the array.
  const items: Array<{
    key: keyof Dictionary['categories']['items'];
    icon: typeof User;
    tint: string;
  }> = [
    { key: 'plastic_surgery', icon: User, tint: 'bg-brand-100 text-brand-800' },
    { key: 'dermatology', icon: Pill, tint: 'bg-hospitality-100 text-hospitality-800' },
    { key: 'dental', icon: Smile, tint: 'bg-care-100 text-care-800' },
    { key: 'hair', icon: Scissors, tint: 'bg-rose-100 text-rose-800' },
    { key: 'health_checkup', icon: Activity, tint: 'bg-blue-100 text-blue-800' },
    { key: 'beauty_tour', icon: MapPin, tint: 'bg-amber-100 text-amber-800' },
    { key: 'makeup', icon: Heart, tint: 'bg-pink-100 text-pink-800' },
    { key: 'photo_studio', icon: Camera, tint: 'bg-slate-100 text-slate-800' },
  ];

  return (
    <section className="border-y bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{dict.categories.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {dict.categories.subtitle}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((c) => {
            const meta = dict.categories.items[c.key];
            const Icon = c.icon;
            return (
              <Link
                key={c.key}
                href={`/${locale}/clinics?category=${c.key}`}
                className="group rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.tint}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{meta.label}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/${locale}/clinics`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            {dict.categories.viewAll}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── AI Teaser ─────────────────────────────────────────────────────

function AiTeaser({ locale, dict }: { locale: PublicLocale; dict: Dictionary }): JSX.Element {
  return (
    <section className="bg-gradient-to-br from-hospitality-50 via-brand-50/60 to-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-hospitality-200 bg-hospitality-50 px-3 py-1 text-xs font-medium text-hospitality-800">
              <Sparkles className="h-3 w-3" />
              AI Glow-Up
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">{dict.ai.title}</h2>
            <p className="mt-2 text-base text-muted-foreground">{dict.ai.subtitle}</p>
            <ul className="mt-6 space-y-2">
              {dict.ai.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-care-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/ai-consult`}
                className="inline-flex items-center gap-1.5 rounded-md bg-hospitality-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-hospitality-700"
              >
                <Sparkles className="h-4 w-4" />
                {dict.ai.cta}
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">🔒 {dict.ai.note}</p>
          </div>

          {/* Visual mock — anonymized analysis card */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Analysis result
                </div>
                <div className="rounded-full bg-care-50 px-2 py-0.5 text-[10px] font-bold text-care-700">
                  85% match
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { name: 'Rhinoplasty (non-incision)', est: '₩ 3.5M ~ 5.5M', recovery: '7 days' },
                  { name: 'Tear-trough filler', est: '₩ 0.4M ~ 0.6M', recovery: '0 days' },
                  { name: 'Skin booster', est: '₩ 0.3M ~ 0.5M', recovery: '0 days' },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Recovery: {r.recovery}
                      </div>
                    </div>
                    <div className="font-mono text-foreground">{r.est}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">
                Demo data shown above. Real analysis runs on actual face photos.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trust Grid ────────────────────────────────────────────────────

function TrustGrid({ dict }: { dict: Dictionary }): JSX.Element {
  const items: Array<{
    key: keyof Dictionary['trust']['items'];
    icon: typeof ShieldCheck;
    tint: string;
  }> = [
    { key: 'koiha', icon: ShieldCheck, tint: 'bg-care-100 text-care-700' },
    { key: 'ai', icon: Languages, tint: 'bg-brand-100 text-brand-700' },
    { key: 'transparent', icon: Wallet, tint: 'bg-hospitality-100 text-hospitality-700' },
    { key: 'aftercare', icon: Heart, tint: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">{dict.trust.title}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c) => {
            const item = dict.trust.items[c.key];
            const Icon = c.icon;
            return (
              <div
                key={c.key}
                className="rounded-xl border bg-card p-5 transition hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.tint}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Inquiry CTA ───────────────────────────────────────────────────

function InquiryCta({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary;
}): JSX.Element {
  return (
    <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 py-16 text-white">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">{dict.inquiryCta.title}</h2>
        <p className="mt-2 text-base text-white/80">{dict.inquiryCta.subtitle}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}/inquiry`}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-white/90"
          >
            {dict.inquiryCta.submit}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
