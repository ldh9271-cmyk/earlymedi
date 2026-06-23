import Link from 'next/link';
import { Sparkles, Camera, Upload, MessageCircle, ArrowRight, Lock } from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

/**
 * AI consultation entry page — Phase 1 placeholder with three real
 * upcoming features showcased:
 *
 *   1. Photo-based recommendation  (face/body photo → recommended
 *      procedures + price estimate + recovery time)
 *   2. Chat consultation           (multilingual AI concierge that
 *      can route to a human after qualification)
 *   3. Pre/post simulation         (visualize expected outcome)
 *
 * Each card links to a placeholder route for now; the actual AI
 * pipelines hook into the existing /lib/ai providers in Phase 2.
 */
export default async function AiConsultPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-hospitality-200 bg-hospitality-50 px-3 py-1 text-xs font-medium text-hospitality-800">
          <Sparkles className="h-3 w-3" />
          {dict.ai.title}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{dict.ai.title}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">
          {dict.ai.subtitle}
        </p>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <FeatureCard
          icon={Camera}
          tint="brand"
          title="얼굴 분석 → 시술 추천"
          desc="얼굴 사진을 업로드하면 AI가 자연스러운 결과로 이어질 시술과 예상 비용, 회복 기간을 분석합니다."
          cta="시작 (곧 공개)"
          ctaHref="#"
        />
        <FeatureCard
          icon={MessageCircle}
          tint="hospitality"
          title="실시간 AI 상담"
          desc="한국어·영어·중국어·일본어·러시아어로 대화. 필요시 인간 컨시어지로 자동 연결됩니다."
          cta="상담 시작 →"
          ctaHref={`/${params.locale}/inquiry`}
        />
        <FeatureCard
          icon={Sparkles}
          tint="care"
          title="시술 전후 시뮬레이션"
          desc="얼굴 사진에 시술 결과를 미리 적용해 봅니다. 결정 전에 시각적으로 확인하세요."
          cta="시뮬레이션 (곧 공개)"
          ctaHref="#"
        />
      </div>

      {/* Upload zone placeholder — the real flow needs object storage
          + AI vision pipeline. Wiring those is Phase 2; for now this is
          a visual prompt that drives users to the existing inquiry form. */}
      <div className="mt-10 rounded-2xl border-2 border-dashed bg-muted/20 p-12 text-center">
        <Upload className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-3 text-lg font-bold">사진 업로드 → AI 분석 (Coming Soon)</h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          업로드 기능은 곧 활성화됩니다. 지금은 1:1 상담으로 동일한 AI 분석을 받으실 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={`/${params.locale}/inquiry`}
            className="inline-flex items-center gap-1.5 rounded-md bg-hospitality-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-hospitality-700"
          >
            <MessageCircle className="h-4 w-4" />
            지금 AI 상담 받기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          {dict.ai.note}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  tint,
  title,
  desc,
  cta,
  ctaHref,
}: {
  icon: typeof Sparkles;
  tint: 'brand' | 'hospitality' | 'care';
  title: string;
  desc: string;
  cta: string;
  ctaHref: string;
}): JSX.Element {
  const palette = {
    brand: { bg: 'bg-brand-100', text: 'text-brand-700', link: 'text-brand-700' },
    hospitality: {
      bg: 'bg-hospitality-100',
      text: 'text-hospitality-700',
      link: 'text-hospitality-700',
    },
    care: { bg: 'bg-care-100', text: 'text-care-700', link: 'text-care-700' },
  }[tint];

  return (
    <div className="rounded-xl border bg-card p-5 transition hover:shadow-md">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${palette.bg}`}>
        <Icon className={`h-5 w-5 ${palette.text}`} />
      </div>
      <h3 className="mt-3 text-base font-bold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      <Link
        href={ctaHref}
        className={`mt-3 inline-flex items-center gap-0.5 text-xs font-medium ${palette.link}`}
      >
        {cta}
      </Link>
    </div>
  );
}
