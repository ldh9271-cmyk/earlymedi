import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';

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
  '@media (max-width: 768px) {'
  + '.m-ai-section { padding: 28px 16px 72px !important; }'
  + '.m-ai-h1 { font-size: 24px !important; letter-spacing: -0.5px !important; }'
  + '.m-ai-sub { font-size: 14px !important; }'
  + '.m-ai-grid { grid-template-columns: 1fr !important; gap: 14px !important; margin-top: 28px !important; }'
  + '.m-ai-upload { padding: 36px 20px !important; margin-top: 28px !important; }'
  + '}';

export default async function AiConsultPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const f = dict.ai.features;

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

      <div
        className="m-ai-grid"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          marginTop: 40,
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
          cta={f.analyze.cta}
          ctaHref="#"
          ctaDisabled
        />
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
          ctaHref={`/${params.locale}/inquiry`}
        />
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

      <div
        className="m-ai-upload"
        style={{
          marginTop: 40,
          border: '1px dashed #dddddd',
          background: '#fafafa',
          borderRadius: 18,
          padding: '56px 32px',
          textAlign: 'center',
        }}
      >
        <svg
          width="42" height="42" viewBox="0 0 24 24" fill="none"
          stroke="#bcbcbc" strokeWidth="1.5"
          style={{ display: 'inline-block' }}
        >
          <path d="M12 3v14M5 10l7-7 7 7" />
          <path d="M5 21h14" />
        </svg>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 0' }}>
          {f.uploadTitle}
        </h2>
        <p
          style={{
            fontSize: 14, color: '#6a6a6a',
            margin: '8px auto 0', maxWidth: 440, lineHeight: 1.5,
          }}
        >
          {f.uploadBody}
        </p>
        <Link
          href={`/${params.locale}/inquiry`}
          style={{
            display: 'inline-block', marginTop: 20,
            background: '#ff385c', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '12px 22px',
            fontWeight: 600, fontSize: 15,
            textDecoration: 'none',
          }}
        >
          {f.uploadCta}
        </Link>
        <p
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, fontSize: 12, color: '#6a6a6a',
            margin: '18px 0 0',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {dict.ai.note}
        </p>
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
