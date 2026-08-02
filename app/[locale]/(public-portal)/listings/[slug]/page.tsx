import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { fetchListingBySlug, type ListingDetail } from '@/lib/listings/query';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { localizePriceUnit } from '@/lib/i18n/price-unit';
import { localizeKoLabel } from '@/lib/i18n/ko-label';
import { DetailInfo } from './_components/detail-info';
import { HeroMobileCarousel } from './_components/hero-mobile-carousel';
import ReserveButton, { type ReserveSummary } from '@/app/[locale]/_components/reserve-modal';
import { BRAND_NAME } from '@/lib/seo/brand';

export const dynamic = 'force-dynamic';

// Next.js 14 가끔 dynamic param 을 percent-encoded 상태로 넘기는
// 사례가 있다 (특히 한글이 들어간 slug). DB 의 slug 컬럼은 한글
// 그대로 저장되어 있으니, 두 형태 모두 시도해 본다.
function decodedSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<{ title: string }> {
  const listing = await fetchListingBySlug({
    locale: params.locale,
    slug: decodedSlug(params.slug),
  });
  return {
    title: listing ? `${listing.title} · ${BRAND_NAME}` : `Listing · ${BRAND_NAME}`,
  };
}

/**
 * Individual listing detail page — Airbnb-style mobile design from
 * the founder's 2026-06-25 reference. Bilingual EN + KR labels are
 * hardcoded to match the mockup; per-listing strings (title, location,
 * description) come from the DB row and respect the per-locale
 * override table.
 *
 * Layout, top → bottom:
 *   1. Hero square (cover image) — back button left, share/save right,
 *      counter "1 / N" bottom-right derived from gallery length.
 *   2. Title + Korean subtitle + rating/reviews/location meta.
 *   3. Host card — placeholder name derived from category until the
 *      partners table grows a public-name field.
 *   4. "Why this is special" — 3 reasons. Pulls strings from
 *      details.highlights when present (shape: [{ titleEn, titleKr,
 *      desc }]) and falls back to category-tuned defaults so every
 *      listing renders something meaningful.
 *   5. Reviews — when reviewsCount > 0, shows one placeholder review
 *      + a "Show all N reviews" link. When 0, a single muted line.
 *   6. Sticky bottom — price + unit, suggested next slot, primary
 *      "Reserve · 예약" CTA that lands in the existing inquiry flow.
 */
export default async function ListingDetailPage({
  params,
}: {
  params: { locale: PublicLocale; slug: string };
}): Promise<JSX.Element> {
  const listing = await fetchListingBySlug({
    locale: params.locale,
    slug: decodedSlug(params.slug),
  });
  if (!listing) {
    notFound();
  }
  const dict = await getDictionary(params.locale);
  const d = dict.detail;

  const heroSrc = listing.coverImageUrl ?? listing.galleryImageUrls[0] ?? '';
  const galleryCount = Math.max(1, listing.galleryImageUrls.length || (listing.coverImageUrl ? 1 : 0));
  const rating = listing.rating ? (listing.rating / 10).toFixed(2) : '4.92';
  const reviewsCount = listing.reviewsCount > 0 ? listing.reviewsCount : 0;
  const reviewsLabel = d.reviewsCount.replace('{n}', String(reviewsCount));
  const subtitleKr = subtitleForCategory(listing.category, d.subtitles);
  const hostName = hostNameForCategory(listing.category);
  const highlights = pickHighlights(listing, params.locale, d.defaultHighlights);
  // 가격 미설정 상품은 details.priceRange 자유형 라벨('무료 입장' 등)
  // 우선 — K팝 성지 같은 무료 스팟이 '문의'로 보이지 않도록.
  const freeformPrice =
    typeof listing.details.priceRange === 'string' ? listing.details.priceRange : null;
  const priceLabel = listing.priceWon
    ? `₩${listing.priceWon.toLocaleString('ko-KR')}`
    : freeformPrice
      ? localizeKoLabel(freeformPrice, params.locale)
      : d.inquire;
  const priceUnit = listing.priceWon
    ? localizePriceUnit(listing.priceUnit, listing.category, d.units, params.locale)
    : '';
  // String concat instead of template literal — SWC's JSX parser
  // mis-counts braces when ${encodeURIComponent(...)} sits before
  // the next <div> and throws "Unexpected token `div`". See memory
  // feedback_swc_inline_css for the same family of bug.
  const reserveHref = '/' + params.locale + '/checkout?slug=' + encodeURIComponent(listing.slug);
  const reserveSummary: ReserveSummary = {
    title: listing.title,
    coverImageUrl: listing.coverImageUrl,
    rating,
    location: listing.locationLabel ?? 'Seoul',
    priceWon: listing.priceWon ?? 0,
    priceUnitLabel: priceUnit || d.units.session,
    interest: listing.interestKey ?? listing.category,
  };

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#222',
        fontFamily: "'Inter', 'Pretendard Variable', system-ui, sans-serif",
        // Reserve room at the bottom so sticky CTA doesn't hide content.
        paddingBottom: 96,
      }}
    >
      {/* Inline mobile CSS — hero gallery collapses to single square. */}
      <style dangerouslySetInnerHTML={{ __html: LISTING_HERO_CSS }} />

      {/* 모바일 (<769) 전용 가로 스와이프 캐러셀 — cover + 갤러리
          이미지를 한 장씩 보여준다. 데스크톱에서는 LISTING_HERO_CSS
          가 display:none 처리. */}
      <div className="m-lh-mobile-only">
        <HeroMobileCarousel
          slides={[heroSrc, ...listing.galleryImageUrls].filter(Boolean)}
          backHref={`/${params.locale}`}
        />
      </div>

      {/* Desktop: Airbnb 1-large + 2x2-thumbs grid (uses cover + first 4 galleryImageUrls).
          Mobile: hidden via CSS — replaced by HeroMobileCarousel above. */}
      <section
        className="m-lh-gallery"
        style={{
          position: 'relative',
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 170px)',
          gap: 8,
          padding: '0 12px',
          height: 'auto',
        }}
      >
        <div
          className="m-lh-main"
          style={{
            gridColumn: 'span 2',
            gridRow: 'span 2',
            background: heroSrc
              ? `#f2f2f2 url(${heroSrc}) center / cover`
              : 'linear-gradient(135deg, #d8c7f5, #e7d6fb)',
            borderRadius: 14,
            position: 'relative',
            minHeight: 280,
          }}
        >
          <Link
            href={`/${params.locale}`}
            aria-label="Back"
            style={floatingBtn({ left: 14 })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        </div>
        {/* 4 thumbs — fall back to a soft gradient when DB has fewer images. */}
        {[0, 1, 2, 3].map((i) => {
          const src = listing.galleryImageUrls[i];
          return (
            <div
              key={i}
              className={`m-lh-thumb m-lh-thumb-${i}`}
              style={{
                background: src
                  ? `#f2f2f2 url(${src}) center / cover`
                  : 'linear-gradient(135deg, #f7f7f7 0%, #ebebeb 100%)',
                borderRadius: 14,
              }}
            />
          );
        })}
        {/* Share + save buttons — pinned top-right of the gallery cluster. */}
        <div className="m-lh-controls" style={{ position: 'absolute', top: 14, right: 26, display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Share" style={floatingBtnInline()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
              <path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
            </svg>
          </button>
          <button type="button" aria-label="Save" style={floatingBtnInline()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
              <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
            </svg>
          </button>
        </div>
        <div
          className="m-lh-counter"
          style={{
            position: 'absolute', bottom: 14, right: 26,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            fontSize: 12, fontWeight: 600,
            padding: '4px 10px', borderRadius: 9999,
          }}
        >
          1 / {galleryCount}
        </div>
      </section>

      {/* 상세 랜딩 이미지는 더 이상 full-bleed 로 렌더하지 않는다 —
          좌측 콘텐츠 칼럼 내부 "상세 정보" 섹션에서 truncated +
          "이미지 더보기" 토글 + 지도와 함께 노출. (DetailInfo 사용) */}

      {/* Desktop ≥1024 splits into 2 cols:
            LEFT  — title / host / why-special / includes / reviews
            RIGHT — sticky booking card (320 wide)
          Mobile/tablet collapse to single column (m-ld-grid CSS).
          Container itself is max-width 1280, padded for breathing room. */}
      <div
        className="m-ld-grid"
        style={{
          maxWidth: 1280,
          margin: '24px auto 0',
          padding: '0 56px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 80,
          alignItems: 'start',
        }}
      >
      <div className="m-ld-left">

      {/* Title + meta */}
      <section style={{ padding: '20px 22px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', margin: 0, lineHeight: 1.2 }}>
          {listing.title}
        </h1>
        {subtitleKr ? (
          <div style={{ fontSize: 15, color: '#6a6a6a', marginTop: 4 }}>{subtitleKr}</div>
        ) : null}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#222', flexWrap: 'wrap' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          <strong style={{ fontWeight: 600 }}>{rating}</strong>
          <span style={{ color: '#222' }}>·</span>
          <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {reviewsLabel}
          </span>
          {listing.locationLabel ? (
            <>
              <span style={{ color: '#222' }}>·</span>
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {listing.locationLabel}
              </span>
            </>
          ) : null}
        </div>
      </section>

      <Divider />

      {/* Host card */}
      <section style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 50, height: 50, borderRadius: 9999, flexShrink: 0,
            background: 'linear-gradient(135deg, #f3d6f1, #d6c7f5)',
          }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{d.hostedBy.replace('{name}', hostName)}</div>
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
            {d.verifiedPartner} · {d.years.replace('{n}', '4')}
          </div>
        </div>
      </section>

      <Divider />

      {/* Why this is special */}
      <section style={{ padding: '0 22px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          {d.whySpecial}
        </h2>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HighlightIcon kind={h.icon} />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{h.title}</div>
                <div style={{ fontSize: 14, color: '#6a6a6a', marginTop: 3, lineHeight: 1.5 }}>
                  {h.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 여행 일정 — details.itinerary 가 있는 여행 패키지 전용 섹션.
          [{ day: '1일차', title: '도착 & 호텔 체크인',
             items: ['공항 픽업 → 명동 호텔', ...] }] 구조를 데이별
          타임라인 카드로 렌더. 2026-07-24 K-뷰티 투어 패키지용 추가. */}
      {(() => {
        // 로케일별 일정 우선 — details.itineraryI18n = { en: [...], ... }.
        // 없으면 kr 기본 itinerary 로 fallback.
        const itinI18n = listing.details.itineraryI18n as
          | Record<string, unknown[]>
          | undefined;
        const raw =
          params.locale !== 'kr' && itinI18n && Array.isArray(itinI18n[params.locale])
            ? itinI18n[params.locale]
            : listing.details.itinerary;
        if (!Array.isArray(raw) || raw.length === 0) return null;
        const days = raw
          .map((d) => {
            const o = d as { day?: string; title?: string; items?: unknown[] };
            return {
              day: typeof o.day === 'string' ? o.day : '',
              title: typeof o.title === 'string' ? o.title : '',
              items: Array.isArray(o.items)
                ? o.items.filter((x): x is string => typeof x === 'string')
                : [],
            };
          })
          .filter((d) => d.day && d.items.length > 0);
        if (days.length === 0) return null;
        const itineraryHeading: Record<string, string> = {
          kr: '여행 일정', en: 'Itinerary', zh: '行程安排',
          ja: '旅行日程', ru: 'Программа тура', vi: 'Lịch trình',
        };
        return (
          <>
            <Divider />
            <section style={{ padding: '0 22px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 18px', lineHeight: 1.3 }}>
                {itineraryHeading[params.locale] ?? itineraryHeading.kr}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {days.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #ebebeb', borderRadius: 14,
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          flexShrink: 0,
                          background: '#ff385c', color: '#fff',
                          fontSize: 12, fontWeight: 700,
                          borderRadius: 9999, padding: '4px 12px',
                        }}
                      >
                        {d.day}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{d.title}</span>
                    </div>
                    <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none' }}>
                      {d.items.map((item, j) => (
                        <li
                          key={j}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            fontSize: 14, color: '#3f3f3f', lineHeight: 1.6,
                            padding: '4px 0',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0, width: 5, height: 5, borderRadius: 9999,
                              background: 'rgba(255,56,92,0.5)', marginTop: 9,
                            }}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
      })()}

      {/* 매장 정보 — 시드가 details JSONB 에 넣어 둔 전화·영업시간·
          오시는 길·시술·가격대·외국인 응대. 헤어/메이크업/PMU 같은
          샵형 상품에만 값이 있고, 없는 상품은 섹션 자체가 숨는다.
          라벨은 itinerary 헤딩과 같은 방식으로 인라인 로케일 맵 —
          사전 6종을 건드리지 않기 위함. */}
      {(() => {
        // 값도 로케일을 탄다 — details.shopInfoI18n[locale] 에 번역이
        // 있으면 그걸 쓰고, 없으면 kr 원본으로 폴백.
        const i18n = listing.details.shopInfoI18n as
          | Record<string, Record<string, string>>
          | undefined;
        const tr = params.locale !== 'kr' && i18n ? i18n[params.locale] : undefined;
        const s = (k: string): string => {
          const localized = tr && typeof tr[k] === 'string' ? tr[k].trim() : '';
          if (localized) return localized;
          return typeof listing.details[k] === 'string' ? (listing.details[k] as string).trim() : '';
        };
        const rows: Array<{ label: Record<string, string>; value: string }> = [
          { label: { kr: '전화', en: 'Phone', zh: '电话', ja: '電話', ru: 'Телефон', vi: 'Điện thoại' }, value: s('phone') },
          { label: { kr: '영업시간', en: 'Hours', zh: '营业时间', ja: '営業時間', ru: 'Часы работы', vi: 'Giờ mở cửa' }, value: s('hours') },
          { label: { kr: '오시는 길', en: 'Getting there', zh: '交通', ja: 'アクセス', ru: 'Как добраться', vi: 'Đường đi' }, value: s('station') },
          { label: { kr: '시술', en: 'Services', zh: '服务项目', ja: 'サービス', ru: 'Услуги', vi: 'Dịch vụ' }, value: s('services') },
          { label: { kr: '가격대', en: 'Price range', zh: '价格区间', ja: '料金目安', ru: 'Цены', vi: 'Khoảng giá' }, value: s('priceRange') },
          { label: { kr: '외국인 응대', en: 'Language support', zh: '外语支持', ja: '外国語対応', ru: 'Языки', vi: 'Hỗ trợ ngoại ngữ' }, value: s('foreignerSupport') },
        ].filter((r) => r.value);
        if (rows.length === 0) return null;
        const heading: Record<string, string> = {
          kr: '매장 정보', en: 'Shop information', zh: '店铺信息',
          ja: '店舗情報', ru: 'О салоне', vi: 'Thông tin cửa hàng',
        };
        return (
          <>
            <Divider />
            <section style={{ padding: '0 22px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
                {heading[params.locale] ?? heading.kr}
              </h2>
              <div
                style={{
                  border: '1px solid #ebebeb', borderRadius: 14,
                  padding: '6px 20px',
                }}
              >
                {rows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 16, alignItems: 'flex-start',
                      padding: '13px 0',
                      borderTop: i === 0 ? undefined : '1px solid #f2f2f2',
                    }}
                  >
                    <span style={{ flexShrink: 0, width: 96, fontSize: 13, color: '#6a6a6a' }}>
                      {r.label[params.locale] ?? r.label.kr}
                    </span>
                    <span style={{ fontSize: 14, color: '#222', lineHeight: 1.55 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
      })()}

      {/* 가격표 — 매장 공식 메뉴판(details.priceTable). 그룹별로 묶어
          시술명과 금액을 나열한다. 없는 상품은 섹션 자체가 숨는다. */}
      {(() => {
        const raw = listing.details.priceTable;
        if (!Array.isArray(raw)) return null;
        // 라벨만 로케일별로 갈아끼운다 — 금액은 kr 표가 유일한 출처라
        // 번역본이 낡아도 가격이 어긋날 수 없다. 순서로 매칭하므로
        // 번역 배열이 짧으면 그 항목만 한국어로 남는다.
        const labels = (listing.details.priceTableI18n as
          | Record<string, { groups?: unknown; items?: unknown }>
          | undefined)?.[params.locale];
        const trGroups = Array.isArray(labels?.groups) ? (labels?.groups as unknown[]) : [];
        const trItems = Array.isArray(labels?.items) ? (labels?.items as unknown[]) : [];
        const pick = (arr: unknown[], i: number, fallback: string): string => {
          const v = arr[i];
          return typeof v === 'string' && v.trim() ? v.trim() : fallback;
        };
        const groups = (raw as Array<{ group?: unknown; items?: unknown }>)
          .map((g, gi) => {
            const groupItemLabels = Array.isArray(trItems[gi]) ? (trItems[gi] as unknown[]) : [];
            return {
              group: pick(trGroups, gi, typeof g.group === 'string' ? g.group : ''),
              items: Array.isArray(g.items)
                ? (g.items as Array<{ name?: unknown; won?: unknown }>)
                    .map((i, ii) => ({
                      name: pick(groupItemLabels, ii, typeof i.name === 'string' ? i.name : ''),
                      won: typeof i.won === 'number' ? i.won : 0,
                    }))
                    .filter((i) => i.name && i.won > 0)
                : [],
            };
          })
          .filter((g) => g.group && g.items.length > 0);
        if (groups.length === 0) return null;
        const trNote = (listing.details.shopInfoI18n as
          | Record<string, Record<string, string>>
          | undefined)?.[params.locale]?.priceNote;
        const note = (typeof trNote === 'string' && trNote.trim())
          ? trNote
          : (typeof listing.details.priceNote === 'string' ? listing.details.priceNote : '');
        const heading: Record<string, string> = {
          kr: '가격표', en: 'Price list', zh: '价目表',
          ja: '料金表', ru: 'Прайс-лист', vi: 'Bảng giá',
        };
        return (
          <>
            <Divider />
            <section style={{ padding: '0 22px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
                {heading[params.locale] ?? heading.kr}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {groups.map((g, gi) => (
                  <div key={gi} style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '14px 18px' }}>
                    <div
                      style={{
                        fontSize: 13, fontWeight: 700, color: '#ff385c',
                        letterSpacing: '0.2px', marginBottom: 4,
                      }}
                    >
                      {g.group}
                    </div>
                    {g.items.map((it, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'baseline', gap: 14,
                          padding: '9px 0',
                          borderTop: ii === 0 ? undefined : '1px solid #f5f5f5',
                        }}
                      >
                        <span style={{ fontSize: 14, color: '#222', lineHeight: 1.5 }}>{it.name}</span>
                        <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#222' }}>
                          ₩{it.won.toLocaleString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {note ? (
                <p
                  style={{
                    fontSize: 12, color: '#6a6a6a', margin: '12px 0 0',
                    lineHeight: 1.7, whiteSpace: 'pre-line',
                  }}
                >
                  {note}
                </p>
              ) : null}
            </section>
          </>
        );
      })()}

      {/* 상세 정보 — detail landing image + Google map. Renders only
          when at least one of (detailLandingImageUrl, address) is set
          in details JSONB. Image starts truncated to 600px with an
          "이미지 더보기" expand button. */}
      {(() => {
        const landingUrl = typeof listing.details.detailLandingImageUrl === 'string'
          ? listing.details.detailLandingImageUrl
          : '';
        const address = typeof listing.details.address === 'string'
          ? listing.details.address
          : '';
        if (!landingUrl && !address) return null;
        const heading: Record<string, string> = {
          kr: '상세 정보', en: 'Details', zh: '详细信息',
          ja: '詳細情報', ru: 'Подробности', vi: 'Thông tin chi tiết',
        };
        return (
          <>
            <Divider />
            <section style={{ padding: '0 22px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
                {heading[params.locale] ?? heading.kr}
              </h2>
              <DetailInfo
                imageUrl={landingUrl || undefined}
                address={address || undefined}
                venueName={listing.title}
              />
            </section>
          </>
        );
      })()}

      <Divider />

      {/* Reviews */}
      <section style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 700 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          <span>{rating} · {reviewsLabel}</span>
        </div>
        {reviewsCount > 0 ? (
          <>
            <div
              style={{
                marginTop: 14,
                border: '1px solid #ebebeb',
                borderRadius: 12,
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 15, color: '#222', lineHeight: 1.5 }}>
                &ldquo;{d.sampleReviewBody}&rdquo;
              </p>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 9999,
                    background: 'linear-gradient(135deg, #ffd5b8, #ffe7d0)',
                  }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{d.sampleReviewerName}</div>
                  <div style={{ fontSize: 12, color: '#6a6a6a' }}>{d.sampleReviewerMeta}</div>
                </div>
              </div>
            </div>
            <Link
              href="#"
              style={{
                display: 'inline-block', marginTop: 14,
                fontSize: 14, color: '#222', fontWeight: 600,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {d.showAllReviews.replace('{n}', String(reviewsCount))}
            </Link>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#6a6a6a', marginTop: 10 }}>
            {d.firstReviewCta}
          </p>
        )}
      </section>
      </div>{/* close .m-ld-left */}

      {/* RIGHT — desktop-only sticky booking card. Hidden on mobile
          (m-ld-right has display:none below 1024 via media query). */}
      <aside className="m-ld-right" style={{ position: 'sticky', top: 120 }}>
        <div
          style={{
            border: '1px solid #ebebeb',
            borderRadius: 16,
            background: '#fff',
            padding: 24,
            boxShadow: 'rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.08) 0 8px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{priceLabel}</span>
            <span style={{ fontSize: 14, color: '#6a6a6a' }}>/ {priceUnit}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 4 }}>
            {d.taxNote}
          </div>
          <ReserveButton
            locale={params.locale}
            href={reserveHref}
            label={d.reserve}
            summary={reserveSummary}
            labels={dict.checkout}
            listingSlug={listing.slug}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 18, height: 52,
              background: '#ff385c', color: '#fff',
              borderRadius: 12,
              fontSize: 16, fontWeight: 700,
              textDecoration: 'none',
            }}
          />
          <div style={{ textAlign: 'center', fontSize: 12, color: '#6a6a6a', marginTop: 10 }}>
            {d.noChargeYet}
          </div>
          <div style={{ height: 1, background: '#ebebeb', margin: '18px 0' }} />
          <div style={{ fontSize: 13, color: '#3f3f3f', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label={d.rowConcierge} value={d.included} />
            <Row label={d.rowBooking} value={d.included} />
            <Row label={d.rowFreeCancel} value="48h" />
          </div>
        </div>
      </aside>

      </div>{/* close .m-ld-grid */}

      {/* Mobile/tablet sticky reserve bar — hidden on desktop where
          the right-column card takes over. */}
      <div
        className="m-ld-bottom-bar"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          background: '#fff',
          borderTop: '1px solid #ebebeb',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, zIndex: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 15 }}>
            <span style={{ textDecoration: listing.priceWon ? undefined : 'line-through', fontWeight: 700 }}>
              {priceLabel}
            </span>
            {priceUnit ? (
              <span style={{ color: '#6a6a6a', fontWeight: 400 }}> / {priceUnit}</span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: '#222', textDecoration: 'underline', textUnderlineOffset: 3, marginTop: 2 }}>
            {d.selectDateNote}
          </div>
        </div>
        {/* PC 우측 카드와 같은 예약 팝업(날짜·시간·인원 → 결제) 흐름.
            href 는 JS 실행 전 클릭에 대한 /checkout 폴백. */}
        <ReserveButton
          locale={params.locale}
          href={reserveHref}
          label={d.reserve}
          summary={reserveSummary}
          labels={dict.checkout}
          listingSlug={listing.slug}
          style={{
            background: '#ff385c', color: '#fff',
            fontSize: 15, fontWeight: 700,
            padding: '12px 22px', borderRadius: 12,
            textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

function Divider(): JSX.Element {
  return <div style={{ height: 1, background: '#ebebeb', margin: '24px 22px' }} />;
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: '#6a6a6a' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// Hero gallery — desktop 2-col (cover left, 4 thumbs right 2x2);
// mobile flattens to single square. The .m-lh-thumb-2/3 hide on
// mobile so the gallery is just cover + 2 small thumbs on phones.
const LISTING_HERO_CSS = ''
  // Mobile + tablet (<1024) — flatten the desktop 2-col body, hide the
  // sticky right card, show the bottom reserve bar, collapse the hero
  // gallery to a single square.
  + '@media (max-width: 1023px) {'
  +   '.m-ld-grid { grid-template-columns: 1fr !important; padding: 0 !important; gap: 0 !important; }'
  +   '.m-ld-right { display: none !important; }'
  + '}'
  + '@media (max-width: 768px) {'
  +   '.m-lh-gallery { display: none !important; }'
  +   '.m-lh-mobile-only { display: block !important; }'
  + '}'
  + '@media (min-width: 769px) {'
  +   '.m-lh-mobile-only { display: none !important; }'
  + '}'
  // Desktop (≥1024) — hide the bottom sticky bar since the right
  // card carries the Reserve CTA inside the content frame.
  + '@media (min-width: 1024px) {'
  +   '.m-ld-bottom-bar { display: none !important; }'
  + '}';

function floatingBtnInline(): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 9999,
    background: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'rgba(0,0,0,0.15) 0 2px 6px',
  };
}

function floatingBtn(p: { left?: number }): React.CSSProperties {
  return {
    position: 'absolute',
    top: 14,
    ...(p.left !== undefined ? { left: p.left } : {}),
    width: 36, height: 36, borderRadius: 9999,
    background: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'rgba(0,0,0,0.15) 0 2px 6px',
    textDecoration: 'none',
  };
}

type Highlight = { icon: 'expert' | 'concierge' | 'check'; title: string; desc: string };

/**
 * Read details.highlights when present (founder-curated per listing),
 * otherwise fall back to category-tuned defaults so the section
 * never renders empty.
 */
type DefaultHighlightTrio = ReadonlyArray<{ title: string; desc: string }>;

function pickHighlights(
  listing: ListingDetail,
  locale: string,
  dh: { hotel: DefaultHighlightTrio; food: DefaultHighlightTrio; beauty: DefaultHighlightTrio; fallback: DefaultHighlightTrio },
): Highlight[] {
  // 로케일별 하이라이트 우선 — details.highlightsI18n = { en: [...], zh: ... }
  // 구조. 없으면 kr 기본 highlights → 카테고리 디폴트 순으로 fallback.
  const i18n = listing.details.highlightsI18n as
    | Record<string, Array<{ icon?: string; title?: string; desc?: string }>>
    | undefined;
  const localized =
    locale && locale !== 'kr' && i18n && Array.isArray(i18n[locale])
      ? i18n[locale]
      : undefined;
  const source = localized ?? listing.details.highlights;
  const fromDb = Array.isArray(source)
    ? (source as Array<{ icon?: string; title?: string; desc?: string }>)
        .map((h) => ({
          icon: (h.icon === 'concierge' || h.icon === 'check' ? h.icon : 'expert') as Highlight['icon'],
          title: typeof h.title === 'string' ? h.title : '',
          desc: typeof h.desc === 'string' ? h.desc : '',
        }))
        .filter((h) => h.title && h.desc)
        .slice(0, 3)
    : [];
  if (fromDb.length === 3) return fromDb;

  // Category-tuned default trios — dict 기반 (6개 로케일).
  const trio = (() => {
    switch (listing.category) {
      case 'hotel': return dh.hotel;
      case 'food':
      case 'restaurant': return dh.food;
      case 'personal_color':
      case 'makeup':
      case 'hair':
      case 'photo_studio': return dh.beauty;
      default: return dh.fallback;
    }
  })();
  const icons: Highlight['icon'][] = ['expert', 'concierge', 'check'];
  return trio.slice(0, 3).map((h, i) => ({
    icon: icons[i] ?? 'check',
    title: h.title,
    desc: h.desc,
  }));
}

function HighlightIcon({ kind }: { kind: 'expert' | 'concierge' | 'check' }): JSX.Element {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#222', strokeWidth: 1.6 };
  switch (kind) {
    case 'expert':
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case 'concierge':
      return (
        <svg {...common}>
          <rect x="3" y="9" width="13" height="8" rx="2" />
          <path d="M16 12h3l2 3v2h-5" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12l5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function subtitleForCategory(
  category: string,
  s: {
    personal_color: string; makeup: string; hair: string; photo_studio: string;
    nail: string; pmu: string;
    hotel: string; food: string; dermatology: string; plastic_surgery: string;
    fallback: string;
  },
): string {
  switch (category) {
    case 'personal_color': return s.personal_color;
    case 'makeup': return s.makeup;
    case 'hair': return s.hair;
    case 'photo_studio': return s.photo_studio;
    case 'nail': return s.nail;
    case 'pmu': return s.pmu;
    case 'hotel': return s.hotel;
    case 'food': return s.food;
    case 'restaurant': return s.food;
    case 'dermatology': return s.dermatology;
    case 'plastic_surgery': return s.plastic_surgery;
    default: return s.fallback;
  }
}

function hostNameForCategory(category: string): string {
  switch (category) {
    case 'personal_color': return 'Glow Studio';
    case 'makeup': return 'Seoul Beauty Lab';
    case 'hair': return 'Cheongdam Hair House';
    case 'photo_studio': return 'Seongsu Studio';
    case 'hotel': return 'Premium Stay Group';
    case 'food': case 'restaurant': return 'Local Taste';
    case 'dermatology': return 'Cheongdam Derma';
    case 'plastic_surgery': return 'Gangnam Aesthetic';
    default: return 'KoreaGlowUp Partner';
  }
}

// priceUnit 현지화는 lib/i18n/price-unit.ts 의 localizePriceUnit 로 통합
// (목록 카드 2곳과 동일 규칙 공유).
