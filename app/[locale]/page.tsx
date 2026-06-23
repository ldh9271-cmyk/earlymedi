import Link from 'next/link';
import { Sparkles, Check, ShieldCheck, Languages, Wallet, Heart } from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { PcHeader } from './glowup/pc/_components/pc-header';

/**
 * Patient portal landing — Airbnb design language.
 *
 * This used to live under (public-portal)/ with the legacy PublicHeader
 * + PublicFooter chrome. The /kr/glowup/pc redesign proved out a much
 * cleaner Airbnb-style look (white surfaces, #ff385c CTA, sticky top
 * nav, photo-first cards), so the main /[locale] landing is rebuilt
 * here against that design language while keeping every content piece
 * the old landing carried (병원 찾기, AI 상담, 카테고리, 신뢰 그리드,
 * 1:1 문의) and every existing dict translation key — so /en /zh /ja
 * continue to work unchanged.
 *
 * Sibling routes (/[locale]/clinics, /[locale]/inquiry, …) still live
 * inside (public-portal)/ and keep the legacy PublicHeader. That's
 * intentional for now — when a visitor lands on /kr they see the
 * Airbnb-style hero, but the deeper utility pages keep their existing
 * dense-information layouts. A follow-up can migrate those once their
 * content is also redesigned.
 */
export default async function PublicLandingPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);
  const { locale } = params;
  return (
    <div
      style={{
        background: '#ffffff',
        fontFamily: "'Inter', 'Airbnb Cereal VF', Circular, -apple-system, system-ui, sans-serif",
        color: '#222222',
        // `overflow-x: clip` instead of hidden so the PcHeader's
        // `position: sticky` keeps working — same gotcha as /glowup/pc.
        overflowX: 'clip',
      }}
    >
      <PcHeader locale={locale} activeKey="all" />

      <main>
        <Hero locale={locale} dict={dict} />
        <Categories locale={locale} dict={dict} />
        <AiTeaser locale={locale} dict={dict} />
        <TrustGrid dict={dict} />
        <InquiryCta locale={locale} dict={dict} />
      </main>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────
// Airbnb-style hero card: dark photo background with a left-aligned
// title + CTA stack. Uses the same crossfade behavior we ship on
// /glowup/pc so the patient sees the platform's signature animated
// hero on the home page too. Stats row sits below the photo card to
// keep the photo from competing with numbers.

function Hero({ locale, dict }: { locale: PublicLocale; dict: Dictionary }): JSX.Element {
  const stats = [
    { value: '120+', label: dict.hero.stats.hospitals },
    { value: '8', label: dict.hero.stats.procedures },
    { value: '3,200', label: dict.hero.stats.patients },
    { value: '5', label: dict.hero.stats.languages },
  ];
  const heroLayers = [
    '/images/glowup-pc/79dac510-b190-481f-bff3-acd40a97ced6.jpg',
    '/images/glowup-pc/00c1f04c-fb00-44c7-b991-2af98bddd6e2.jpg',
    '/images/glowup-pc/b2e666ae-08b3-480c-8739-f31a1292573b.jpg',
    '/images/glowup-pc/dd5e57b8-0e0a-4154-8174-8c3c2593a905.jpg',
  ];
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 40px 0' }}>
      {/* Hero crossfade rule scoped to this page. */}
      <style>{`
        @keyframes landingHeroFade {
          0% { opacity: 0; } 5% { opacity: 1; } 25% { opacity: 1; }
          30% { opacity: 0; } 100% { opacity: 0; }
        }
        .landing-hero-layer {
          position: absolute; inset: 0;
          background-size: cover; background-position: center;
          animation: landingHeroFade 24s infinite;
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          height: 460,
          borderRadius: 20,
          overflow: 'hidden',
          background: `#222 url(${heroLayers[0]}) center / cover`,
        }}
      >
        {heroLayers.map((src, i) => (
          <div
            key={i}
            className="landing-hero-layer"
            style={{ backgroundImage: `url(${src})`, animationDelay: `${i * 6}s` }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div style={{ position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)', maxWidth: 560, color: '#fff' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#222',
              fontSize: 13, fontWeight: 600, borderRadius: 9999, padding: '6px 12px',
            }}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            {dict.hero.badge}
          </div>
          <h1
            style={{
              whiteSpace: 'pre-line', fontSize: 44, fontWeight: 700,
              lineHeight: 1.15, margin: '18px 0 0', letterSpacing: '-1px',
            }}
          >
            {dict.hero.title}
          </h1>
          <p
            style={{
              fontSize: 16, fontWeight: 400, lineHeight: 1.55,
              margin: '14px 0 0', color: 'rgba(255,255,255,0.92)',
              maxWidth: 520,
            }}
          >
            {dict.hero.subtitle}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            <Link
              href={`/${locale}/ai-consult`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#ff385c', color: '#fff',
                borderRadius: 8, height: 48, padding: '0 22px',
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
              }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              {dict.hero.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/clinics`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', color: '#222', border: '1px solid #fff',
                borderRadius: 8, height: 48, padding: '0 22px',
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
              }}
            >
              {dict.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          marginTop: 32,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          paddingBottom: 8,
        }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: '#6a6a6a',
              }}
            >
              {s.label}
            </div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Categories ────────────────────────────────────────────────────
// 8 procedure categories — Airbnb-style square photo cards. Each
// category points to a hand-crafted SVG illustration in
// /public/images/categories/ (gradient background + on-brand iconography
// baked into the same file). Links to /clinics?category=<key> which
// already supports the filter via category_listings table.

function Categories({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary;
}): JSX.Element {
  const items: Array<{
    key: keyof Dictionary['categories']['items'];
    img: string;
  }> = [
    { key: 'plastic_surgery', img: '/images/categories/plastic-surgery.svg' },
    { key: 'dermatology',     img: '/images/categories/dermatology.svg' },
    { key: 'dental',          img: '/images/categories/dental.svg' },
    { key: 'hair',            img: '/images/categories/hair.svg' },
    { key: 'health_checkup',  img: '/images/categories/health-checkup.svg' },
    { key: 'beauty_tour',     img: '/images/categories/beauty-tour.svg' },
    { key: 'makeup',          img: '/images/categories/makeup.svg' },
    { key: 'photo_studio',    img: '/images/categories/photo-studio.svg' },
  ];
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          {dict.categories.title}
        </h2>
        <Link
          href={`/${locale}/clinics`}
          style={{ fontSize: 14, fontWeight: 600, color: '#222', textDecoration: 'none' }}
        >
          {dict.categories.viewAll} ›
        </Link>
      </div>
      <p style={{ fontSize: 15, color: '#6a6a6a', margin: '6px 0 0' }}>
        {dict.categories.subtitle}
      </p>
      <div
        style={{
          marginTop: 28,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
        }}
      >
        {items.map((c) => {
          const meta = dict.categories.items[c.key];
          return (
            <Link
              key={c.key}
              href={`/${locale}/clinics?category=${c.key}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  aspectRatio: '1',
                  borderRadius: 14,
                  background: `#222 url(${c.img}) center / cover`,
                  display: 'flex', alignItems: 'flex-end', padding: 18,
                  transition: 'transform 0.2s ease',
                }}
              >
                <span
                  style={{
                    color: '#fff', fontWeight: 700, fontSize: 18,
                    textShadow: '0 2px 8px rgba(0,0,0,0.45)',
                  }}
                >
                  {meta.label}
                </span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: '#6a6a6a' }}>{meta.desc}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── AI Teaser ─────────────────────────────────────────────────────
// Split layout: copy + bullets on the left, mock "analysis result"
// card on the right. Kept the demo data verbatim from the old landing
// (anonymized procedure names + estimated price ranges) so this still
// communicates what the AI does without any backend dependency.

function AiTeaser({ locale, dict }: { locale: PublicLocale; dict: Dictionary }): JSX.Element {
  return (
    <section style={{ background: '#f7f7f7', marginTop: 80, padding: '64px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1px solid #ebebeb',
                color: '#222', fontSize: 12, fontWeight: 600,
                borderRadius: 9999, padding: '6px 12px',
              }}
            >
              <Sparkles style={{ width: 14, height: 14, color: '#ff385c' }} />
              AI Glow-Up
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '12px 0 0' }}>
              {dict.ai.title}
            </h2>
            <p style={{ fontSize: 16, color: '#3f3f3f', margin: '12px 0 0', lineHeight: 1.55 }}>
              {dict.ai.subtitle}
            </p>
            <ul style={{ marginTop: 24, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dict.ai.bullets.map((b) => (
                <li key={b} style={{ display: 'flex', gap: 10, fontSize: 15 }}>
                  <Check style={{ width: 18, height: 18, color: '#ff385c', flexShrink: 0, marginTop: 2 }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 28 }}>
              <Link
                href={`/${locale}/ai-consult`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#ff385c', color: '#fff',
                  borderRadius: 8, height: 48, padding: '0 24px',
                  fontWeight: 600, fontSize: 15, textDecoration: 'none',
                }}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                {dict.ai.cta}
              </Link>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: '#6a6a6a' }}>🔒 {dict.ai.note}</p>
          </div>

          {/* Demo analysis card */}
          <div
            style={{
              background: '#fff', border: '1px solid #ebebeb', borderRadius: 16, padding: 20,
              boxShadow: 'rgba(0,0,0,0.04) 0 4px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6a6a6a' }}>
                Analysis result
              </div>
              <div style={{ background: '#fce4ea', color: '#ff385c', fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: '4px 10px' }}>
                85% match
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Rhinoplasty (non-incision)', est: '₩ 3.5M ~ 5.5M', recovery: '7 days' },
                { name: 'Tear-trough filler', est: '₩ 0.4M ~ 0.6M', recovery: '0 days' },
                { name: 'Skin booster', est: '₩ 0.3M ~ 0.5M', recovery: '0 days' },
              ].map((r) => (
                <div
                  key={r.name}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid #ebebeb', background: '#fafafa',
                    borderRadius: 10, padding: '10px 14px', fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#6a6a6a', marginTop: 2 }}>
                      Recovery: {r.recovery}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.est}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                border: '1px dashed #ebebeb', background: '#fafafa',
                borderRadius: 10, padding: '8px 12px',
                fontSize: 11, color: '#6a6a6a',
              }}
            >
              Demo data shown above. Real analysis runs on actual face photos.
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
  }> = [
    { key: 'koiha',       icon: ShieldCheck },
    { key: 'ai',          icon: Languages },
    { key: 'transparent', icon: Wallet },
    { key: 'aftercare',   icon: Heart },
  ];
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px 0' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', margin: 0, textAlign: 'center' }}>
        {dict.trust.title}
      </h2>
      <div
        style={{
          marginTop: 28,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
        }}
      >
        {items.map((c) => {
          const item = dict.trust.items[c.key];
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              style={{
                border: '1px solid #ebebeb', borderRadius: 14, padding: 22, background: '#fff',
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: '#fff5f6', color: '#ff385c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon style={{ width: 22, height: 22 }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 0' }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.55 }}>
                {item.desc}
              </p>
            </div>
          );
        })}
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
    <section style={{ marginTop: 80, padding: '64px 0', background: '#222' }}>
      <div
        style={{
          maxWidth: 720, margin: '0 auto', padding: '0 40px',
          textAlign: 'center', color: '#fff',
        }}
      >
        <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
          {dict.inquiryCta.title}
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', margin: '12px 0 0' }}>
          {dict.inquiryCta.subtitle}
        </p>
        <div
          style={{
            marginTop: 28, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
          }}
        >
          <Link
            href={`/${locale}/inquiry`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#ff385c', color: '#fff',
              borderRadius: 8, height: 50, padding: '0 28px',
              fontWeight: 600, fontSize: 16, textDecoration: 'none',
            }}
          >
            {dict.inquiryCta.submit} →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
// (Inline lightweight footer — the existing PublicFooter lives in the
// (public-portal) layout and isn't applied here. Keep it minimal.)
