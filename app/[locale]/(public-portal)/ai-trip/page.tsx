import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { loadTripPlan } from '@/lib/ai/trip-workflow';
import TripPlanner, { type PlanView } from './_components/trip-planner';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.ai.trip.title} · GlowUpTour`, description: dict.ai.trip.subtitle };
}

/**
 * AI 여행하기 — 질문 → 하루 단위 일정 → (회원가입/로그인) → 이메일 → 일정 확정 → 플랫폼 도움 여부
 *   → (도움) 컨시어지 검증·견적 인보이스 → 결제 → 스케줄 완성.
 *  ?plan=<id>&send=1 : 회원가입/로그인 뒤 돌아온 상태. 저장된 대화를 다시 띄우고 자동으로 이메일을 보낸다.
 */
export default async function AiTripPage({ params, searchParams }: { params: { locale: string }; searchParams: { plan?: string; send?: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.ai.trip;

  const supabase = createSupabaseServerClient();
  let userEmail: string | null = null; let userId: string | null = null;
  try { const { data: auth } = await supabase.auth.getUser(); userEmail = auth.user?.email ?? null; userId = auth.user?.id ?? null; } catch { /* 비로그인 취급 */ }

  let plan: PlanView | null = null;
  let initialMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const planParam = searchParams.plan ?? '';
  if (/^[0-9a-f-]{36}$/i.test(planParam)) {
    try {
      const loaded = await loadTripPlan(planParam);
      // 남의 일정은 열지 않는다 (비회원 생성분은 id 를 아는 사람이 이어서 볼 수 있음 — id 가 곧 열쇠)
      if (loaded && (!loaded.plan.userId || loaded.plan.userId === userId)) {
        const p = loaded.plan;
        initialMessages = p.messages ?? [];
        plan = {
          id: p.id, status: p.status, emailed: Boolean(p.emailedAt), quoteWon: p.quoteWon, quoteNote: p.quoteNote,
          verifiedPlanMd: p.verifiedPlanMd, startYmd: p.startYmd, order: loaded.order,
        };
      }
    } catch { /* 없으면 새 대화 */ }
  }

  return (
    <section className="m-trip-section" style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: '@media (max-width:768px){.m-trip-section{padding:24px 16px 72px !important}.m-trip-h1{font-size:24px !important}}' }} />
      <header style={{ textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>✈️ {dict.header.tabAi}</span>
        <h1 className="m-trip-h1" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.8px', margin: '16px 0 8px' }}>{t.title}</h1>
        <p style={{ fontSize: 15, color: '#6a6a6a', margin: '0 auto', maxWidth: 640, lineHeight: 1.55 }}>{t.subtitle}</p>
      </header>
      <TripPlanner
        locale={locale}
        t={t}
        userEmail={userEmail}
        initialPlan={plan}
        initialMessages={initialMessages}
        autoSend={searchParams.send === '1'}
        tossEnabled={Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY)}
      />
    </section>
  );
}
