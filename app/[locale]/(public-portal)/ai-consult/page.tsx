import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiFaceAnalyses } from '@/drizzle/schema/ai-face-analyses';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import FaceAnalyzer, { type FaceInitialResult } from './_components/face-analyzer';
import AiChat from './_components/ai-chat';

export const dynamic = 'force-dynamic';

/**
 * AI consultation entry page — Airbnb design language.
 *
 * Phase 1 placeholder for three upcoming features:
 *   1. Photo → procedure recommendation
 *   2. Real-time multilingual AI chat
 *   3. Pre/post simulation
 *
 * 문구는 dict.ai.features (6개 로케일), 모바일에서는 3컬럼 카드가
 * 1컬럼으로 접힌다 (AI_CSS plain-string @media 블록).
 */

const AI_CSS =
  // 업로더·상담창이 그리드 셀 안으로 들어왔으므로 자체 상단 여백은
  // 끄고 그리드 gap 이 간격을 담당한다.
  '.m-ai-analyzer-slot .m-ai-upload { margin-top: 0 !important; }'
  + '.m-ai-chat-slot #ai-chat { margin-top: 0 !important; }'
  + '@media (max-width: 768px) {'
  + '.m-ai-section { padding: 28px 16px 72px !important; }'
  + '.m-ai-h1 { font-size: 24px !important; letter-spacing: -0.5px !important; }'
  + '.m-ai-sub { font-size: 14px !important; }'
  + '.m-ai-grid { grid-template-columns: 1fr !important; gap: 14px !important; margin-top: 28px !important; }'
  + '.m-ai-upload { padding: 36px 20px !important; }'
  // 모바일(1열)에서는 소스 순서(카드1 → 업로더 → 카드2 → 상담창 →
  // 카드3)를 그대로 써서 업로더는 '얼굴 분석' 카드, 상담창은 '실시간
  // AI 상담' 카드 바로 아래에 온다.
  + '.m-ai-analyzer-slot, .m-ai-chat-slot { order: 0 !important; }'
  + '}';

export default async function AiConsultPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { analysis?: string; send?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const f = dict.ai.features;

  // 얼굴 분석 결과 이메일 발송은 회원 계정 이메일로만 — 로그인 상태와, 회원가입 뒤 복귀한 저장 결과(?analysis=)를 읽는다.
  let userEmail: string | null = null; let userId: string | null = null;
  try {
    const { data: auth } = await createSupabaseServerClient().auth.getUser();
    userEmail = auth.user?.email ?? null; userId = auth.user?.id ?? null;
  } catch { /* 비로그인 취급 */ }
  let initialResult: FaceInitialResult | null = null;
  const aid = searchParams.analysis ?? '';
  if (/^[0-9a-f-]{36}$/i.test(aid)) {
    try {
      const [row] = await db.select().from(aiFaceAnalyses).where(eq(aiFaceAnalyses.id, aid)).limit(1);
      if (row && (!row.userId || row.userId === userId)) initialResult = { id: row.id, analysis: row.analysis, recs: row.recs };
    } catch { /* 없으면 새 분석 */ }
  }

  return (
    <section className="m-ai-section" style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: AI_CSS }} />
      <header style={{ textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff5f7', color: '#ff385c',
            border: '1px solid #fecdd3',
            borderRadius: 9999, padding: '5px 12px',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 6.4 6.6 0.6-5 4.4 1.6 6.6L12 16.8l-5.6 3.2 1.6-6.6L3 9l6.6-0.6z" />
          </svg>
          {dict.ai.title}
        </span>
        <h1
          className="m-ai-h1"
          style={{
            fontSize: 32, fontWeight: 700, letterSpacing: '-0.8px',
            margin: '16px 0 8px',
          }}
        >
          {dict.ai.title}
        </h1>
        <p
          className="m-ai-sub"
          style={{
            fontSize: 16, color: '#6a6a6a',
            margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
            lineHeight: 1.5,
          }}
        >
          {dict.ai.subtitle}
        </p>
      </header>

      {/* AI 여행하기 — 자유·패키지·연수 일정 추천 + 회원가입 후 이메일 발송 (전폭 배너) */}
      <Link
        href={`/${params.locale}/ai-trip`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
          marginTop: 32, padding: '20px 24px', borderRadius: 16, border: '1px solid #bfdbfe',
          background: 'linear-gradient(120deg,#eff6ff,#f0fdfa)', color: 'inherit', textDecoration: 'none',
          boxShadow: 'rgba(0,0,0,0.02) 0 1px 2px, rgba(0,0,0,0.06) 0 4px 12px',
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>✈️ {dict.ai.trip.hubTitle}</div>
          <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.55, margin: '6px 0 0', maxWidth: 640 }}>{dict.ai.trip.hubDesc}</p>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{dict.ai.trip.hubCta}</span>
      </Link>

      <div
        className="m-ai-grid"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          marginTop: 24,
        }}
      >
        <FeatureCard
          iconBg="#fff5f7"
          iconColor="#ff385c"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="7" width="18" height="13" rx="2.5" />
              <circle cx="12" cy="13.5" r="3.5" />
              <path d="M9 7l1.5-2h3L15 7" />
            </svg>
          }
          title={f.analyze.title}
          desc={f.analyze.desc}
          cta={dict.ai.cta}
          ctaHref="#ai-analyzer"
        />
        {/* 업로더는 그리드의 전폭 행 — 데스크톱은 order:4 로 카드 3장
            아래, 모바일은 위 CSS 가 order 를 풀어 소스 순서(카드1 바로
            아래)로 노출된다. */}
        <div className="m-ai-analyzer-slot" style={{ gridColumn: '1 / -1', order: 4 }}>
          <FaceAnalyzer
            locale={params.locale}
            t={dict.ai.upload}
            note={dict.ai.note}
            userEmail={userEmail}
            initialResult={initialResult}
            autoSend={searchParams.send === '1'}
            catTitles={{
              clinic: dict.header.catHospital,
              personal_color: dict.pcCategory.color.title,
              hair: dict.pcCategory.hair.title,
              nail: dict.pcCategory.nail.title,
              pmu: dict.pcCategory.pmu.title,
            }}
          />
        </div>
        <FeatureCard
          iconBg="#eff6ff"
          iconColor="#2563eb"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" />
            </svg>
          }
          title={f.chat.title}
          desc={f.chat.desc}
          cta={f.chat.cta}
          ctaHref="#ai-chat"
        />
        {/* 상담창도 업로더와 같은 방식의 전폭 행 — 데스크톱은 order:5 로
            업로더 아래, 모바일은 '실시간 AI 상담' 카드 바로 아래. */}
        <div className="m-ai-chat-slot" style={{ gridColumn: '1 / -1', order: 5 }}>
          <AiChat locale={params.locale} t={dict.ai.chat} lead={dict.ai.upload} />
        </div>
        <FeatureCard
          iconBg="#ecfdf5"
          iconColor="#047857"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 2l2.4 6.4 6.6 0.6-5 4.4 1.6 6.6L12 16.8l-5.6 3.2 1.6-6.6L3 9l6.6-0.6z" />
            </svg>
          }
          title={f.sim.title}
          desc={f.sim.desc}
          cta={f.sim.cta}
          ctaHref="#"
          ctaDisabled
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  cta,
  ctaHref,
  ctaDisabled,
}: {
  icon: JSX.Element;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  cta: string;
  ctaHref: string;
  ctaDisabled?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        border: '1px solid #ebebeb', borderRadius: 14,
        background: '#fff', padding: 22,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#6a6a6a', lineHeight: 1.55, margin: 0 }}>{desc}</p>
      <div style={{ marginTop: 'auto', paddingTop: 14 }}>
        <Link
          href={ctaHref}
          style={{
            fontSize: 13, fontWeight: 600,
            color: ctaDisabled ? '#bcbcbc' : iconColor,
            textDecoration: 'none',
            pointerEvents: ctaDisabled ? 'none' : 'auto',
          }}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
