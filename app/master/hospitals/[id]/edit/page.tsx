import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, Image as ImageIcon, Plus, X, Languages, Copy } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { organizations } from '@/drizzle/schema/organizations';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import {
  upsertLocaleBasics,
  uploadLocaleCover,
  removeLocaleCover,
  addLocaleGalleryImage,
  removeLocaleGalleryImage,
  uploadLocaleLanding,
  removeLocaleLanding,
  copyLocaleContent,
} from './_action';

export const metadata = { title: '병원 다국어 콘텐츠 편집 · 마스터' };
export const dynamic = 'force-dynamic';

type Locale = 'kr' | 'en' | 'zh' | 'ja';
const LOCALES: readonly Locale[] = ['kr', 'en', 'zh', 'ja'] as const;

const LOCALE_LABELS: Record<Locale, { full: string; short: string; flag: string; portalPath: string }> = {
  kr: { full: '한국어', short: 'KR', flag: '🇰🇷', portalPath: 'kr' },
  en: { full: 'English', short: 'EN', flag: '🇺🇸', portalPath: 'en' },
  zh: { full: '中文', short: 'ZH', flag: '🇨🇳', portalPath: 'zh' },
  ja: { full: '日本語', short: 'JA', flag: '🇯🇵', portalPath: 'ja' },
};

function parseLocale(raw?: string): Locale {
  return raw && (LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : 'kr';
}

/**
 * Master-only per-locale content editor.
 *
 * Each hospital has up to 4 independent content rows — one per locale
 * (kr/en/zh/ja). Master flips between them via the ?lng= query string;
 * the URL is the source of truth so deep-links + browser back work
 * naturally. Each tab edits its own row in hospital_locale_content via
 * locale-aware server actions.
 *
 * Fallback chain on the patient page:
 *   1. hospital_locale_content WHERE (hospital_id, locale)
 *   2. hospitals.* (legacy / pre-locale upload)
 *
 * So master can fill EN first and the KR public page still shows the
 * legacy KR copy until master gets around to filling the KR tab.
 */
export default async function MasterHospitalEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string; lng?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/master/hospitals/${params.id}/edit`);
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const activeLocale = parseLocale(searchParams.lng);

  // Load the base hospital row (used as fallback hints + identity).
  // Graceful fallback if image columns missing (older deployments).
  type BaseRow = {
    id: string;
    name: string;
    slug: string;
    countryCode: string;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    landingImageUrl: string | null;
    notes: string | null;
    orgName: string;
  };
  let base: BaseRow | null = null;
  let columnsMissing = false;
  try {
    const [r] = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        countryCode: hospitals.countryCode,
        coverImageUrl: hospitals.coverImageUrl,
        galleryImageUrls: hospitals.galleryImageUrls,
        landingImageUrl: hospitals.landingImageUrl,
        notes: hospitals.notes,
        orgName: organizations.name,
      })
      .from(hospitals)
      .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
      .where(eq(hospitals.id, params.id))
      .limit(1);
    if (r) base = { ...r, galleryImageUrls: (r.galleryImageUrls ?? []) as string[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('column')) {
      columnsMissing = true;
      const [r] = await db
        .select({
          id: hospitals.id,
          name: hospitals.name,
          slug: hospitals.slug,
          countryCode: hospitals.countryCode,
          coverImageUrl: hospitals.coverImageUrl,
          notes: hospitals.notes,
          orgName: organizations.name,
        })
        .from(hospitals)
        .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
        .where(eq(hospitals.id, params.id))
        .limit(1);
      if (r) base = { ...r, galleryImageUrls: [], landingImageUrl: null };
    } else {
      throw e;
    }
  }
  if (!base) notFound();

  // Load the locale row for the active tab. May not exist yet —
  // in that case the form renders empty with fallback hints pointing
  // to the base hospital row.
  type LocaleRow = {
    name: string | null;
    intro: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    landingImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  let lc: LocaleRow | null = null;
  // Counts of filled locales — drives the green/grey dots on the tab strip.
  const filledLocales = new Set<Locale>();
  let localeTableMissing = false;
  try {
    const [r] = await db
      .select({
        name: hospitalLocaleContent.name,
        intro: hospitalLocaleContent.intro,
        coverImageUrl: hospitalLocaleContent.coverImageUrl,
        galleryImageUrls: hospitalLocaleContent.galleryImageUrls,
        landingImageUrl: hospitalLocaleContent.landingImageUrl,
        seoTitle: hospitalLocaleContent.seoTitle,
        seoDescription: hospitalLocaleContent.seoDescription,
      })
      .from(hospitalLocaleContent)
      .where(
        and(
          eq(hospitalLocaleContent.hospitalId, base.id),
          eq(hospitalLocaleContent.locale, activeLocale),
        ),
      )
      .limit(1);
    if (r) lc = { ...r, galleryImageUrls: (r.galleryImageUrls ?? []) as string[] };

    // Sibling locale fill state for the tab dots.
    const sibling = await db
      .select({
        locale: hospitalLocaleContent.locale,
        name: hospitalLocaleContent.name,
        intro: hospitalLocaleContent.intro,
        coverImageUrl: hospitalLocaleContent.coverImageUrl,
        galleryImageUrls: hospitalLocaleContent.galleryImageUrls,
        landingImageUrl: hospitalLocaleContent.landingImageUrl,
      })
      .from(hospitalLocaleContent)
      .where(eq(hospitalLocaleContent.hospitalId, base.id));
    for (const s of sibling) {
      const anyFilled =
        !!s.name ||
        !!s.intro ||
        !!s.coverImageUrl ||
        !!s.landingImageUrl ||
        ((s.galleryImageUrls ?? []) as string[]).length > 0;
      if (anyFilled && (LOCALES as readonly string[]).includes(s.locale)) {
        filledLocales.add(s.locale as Locale);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      localeTableMissing = true;
    } else {
      throw e;
    }
  }

  const gallery = lc?.galleryImageUrls ?? [];
  const fallbackName = base.name;
  const fallbackIntro = base.notes;
  const fallbackCover = base.coverImageUrl;
  const fallbackLanding = base.landingImageUrl;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/master/hospitals"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        병원 통합 관리로
      </Link>

      <header className="my-6">
        <Badge variant="destructive" className="mb-2">
          마스터 전용 · 다국어 콘텐츠
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{base.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {base.orgName} · {base.countryCode}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          slug: <code className="rounded bg-muted px-1 font-mono">{base.slug}</code>
          <Link
            href={`/${LOCALE_LABELS[activeLocale].portalPath}/clinics/${base.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 text-brand-700 hover:text-brand-900"
          >
            {LOCALE_LABELS[activeLocale].full} 포털에서 보기
            <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </header>

      {/* ─── Locale tab strip ───────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
        {LOCALES.map((lng) => {
          const isActive = lng === activeLocale;
          const isFilled = filledLocales.has(lng);
          return (
            <Link
              key={lng}
              href={`/master/hospitals/${base!.id}/edit?lng=${lng}`}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-brand-300'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
              prefetch={false}
            >
              <span className="text-base leading-none">{LOCALE_LABELS[lng].flag}</span>
              <span>{LOCALE_LABELS[lng].full}</span>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isFilled ? 'bg-care-500' : 'bg-muted-foreground/30'
                }`}
                title={isFilled ? '콘텐츠 있음' : '비어 있음'}
              />
            </Link>
          );
        })}
      </div>

      {searchParams.saved ? (
        <div className="mb-4 rounded-md border border-care-300 bg-care-50 p-3 text-xs text-care-900">
          ✅ 저장되었습니다. {LOCALE_LABELS[activeLocale].full} 포털에 즉시 반영됩니다.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          ⚠ {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}
      {localeTableMissing ? (
        <div className="mb-4 rounded-lg border border-hospitality-300 bg-hospitality-50 p-4 text-sm">
          <p className="font-semibold text-hospitality-900">⚠ 다국어 테이블 마이그레이션 필요</p>
          <p className="mt-1 text-xs text-hospitality-900/80">
            <code className="rounded bg-white px-1 font-mono">hospital_locale_content</code>
            {' '}테이블이 아직 Supabase 에 없습니다. 4-탭이 저장되지 않습니다.
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs text-hospitality-900/80">
            <li>Supabase Dashboard → <strong>SQL Editor</strong> → <strong>+ New query</strong></li>
            <li>
              <code className="rounded bg-white px-1 font-mono">drizzle/sql/hospital-locale-content.sql</code>
              {' '}전체 복붙 → Run
            </li>
            <li>이 페이지 새로고침 → 노란 배너 사라지면 적용 완료</li>
          </ol>
        </div>
      ) : null}
      {columnsMissing ? (
        <div className="mb-4 rounded-lg border border-hospitality-300 bg-hospitality-50 p-4 text-sm">
          <p className="font-semibold text-hospitality-900">⚠ 기본 이미지 컬럼 마이그레이션 필요</p>
          <p className="mt-1 text-xs text-hospitality-900/80">
            <code className="rounded bg-white px-1 font-mono">drizzle/sql/hospital-images.sql</code> + <code className="rounded bg-white px-1 font-mono">drizzle/sql/hospital-landing.sql</code>
            {' '}을 차례로 실행해 주세요. (기존 hospitals 테이블의 legacy 이미지 컬럼)
          </p>
        </div>
      ) : null}

      {/* ─── Copy-from-other-locale shortcut ─────────────────────── */}
      {filledLocales.size > 0 && !filledLocales.has(activeLocale) ? (
        <Card className="mb-6 border-brand-200 bg-brand-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-brand-700" />
              <CardTitle className="text-sm">다른 언어 콘텐츠 복사해 시작하기</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {LOCALE_LABELS[activeLocale].full} 탭이 비어 있습니다. 다른 언어에서 복사해 와서 번역만 수정하면 빠릅니다.
              이미지는 그대로 가져오고, 텍스트는 원본 언어 그대로 들어가니 다시 번역해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(filledLocales).map((src) => (
                <form key={src} action={copyLocaleContent} className="inline">
                  <input type="hidden" name="id" value={base.id} />
                  <input type="hidden" name="from" value={src} />
                  <input type="hidden" name="to" value={activeLocale} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    {LOCALE_LABELS[src].flag} {LOCALE_LABELS[src].full} → {LOCALE_LABELS[activeLocale].short}
                  </button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ─── Basics card (name, intro, SEO) ──────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <CardTitle className="text-base">
              {LOCALE_LABELS[activeLocale].full} 기본 정보
            </CardTitle>
          </div>
          <CardDescription>
            이 언어로 환자가 검색·열람할 때 보이는 이름·소개·SEO 메타. 비워두면 다른 언어 또는 기본값으로 자동 fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertLocaleBasics} className="space-y-4">
            <input type="hidden" name="id" value={base.id} />
            <input type="hidden" name="lng" value={activeLocale} />

            <div className="space-y-1.5">
              <Label htmlFor="lc-name">병원명 ({LOCALE_LABELS[activeLocale].short})</Label>
              <input
                id="lc-name"
                name="name"
                defaultValue={lc?.name ?? ''}
                placeholder={fallbackName}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                비워두면 기본값 사용: <code className="rounded bg-muted px-1 font-mono">{fallbackName}</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lc-intro">소개 텍스트 ({LOCALE_LABELS[activeLocale].short})</Label>
              <textarea
                id="lc-intro"
                name="intro"
                rows={8}
                defaultValue={lc?.intro ?? ''}
                placeholder={
                  fallbackIntro ??
                  '예) 강남 한복판의 30년 전통 성형외과. 코·눈·안면윤곽 전문, 외국인 환자 누적 3,000명+.'
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                줄바꿈 유지. 비워두면 다른 언어 / 기본 소개로 fallback.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lc-seo-title">SEO 타이틀 (선택)</Label>
                <input
                  id="lc-seo-title"
                  name="seoTitle"
                  defaultValue={lc?.seoTitle ?? ''}
                  placeholder={`${fallbackName} | KoreaGlowUp`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">권장 50–60자.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lc-seo-desc">SEO 설명 (선택)</Label>
                <input
                  id="lc-seo-desc"
                  name="seoDescription"
                  defaultValue={lc?.seoDescription ?? ''}
                  placeholder="검색 결과에 노출될 한 줄 설명"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">권장 120–160자.</p>
              </div>
            </div>

            <Button type="submit" variant="brand">
              저장
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Cover image card ───────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <CardTitle className="text-base">
              대표 사진 (Hero) — {LOCALE_LABELS[activeLocale].short}
            </CardTitle>
          </div>
          <CardDescription>
            환자 포털 상세 페이지 상단 16:6 영역에 노출. 국가별로 다른 사진 (예: KR=시술실, EN=서양인 모델, ZH=중문 간판)을 올릴 수 있습니다. 최대 10MB · 권장 1280×800.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lc?.coverImageUrl ? (
            <div className="overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lc.coverImageUrl}
                alt={`현재 대표 사진 (${LOCALE_LABELS[activeLocale].short})`}
                className="aspect-[16/6] w-full object-cover"
              />
            </div>
          ) : fallbackCover ? (
            <div className="overflow-hidden rounded-md border-2 border-dashed bg-muted opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fallbackCover}
                alt="기본값 (fallback)"
                className="aspect-[16/6] w-full object-cover"
              />
              <p className="border-t bg-background/80 px-3 py-1.5 text-[11px] text-muted-foreground">
                ⓘ 이 언어 전용 사진이 아직 없어서 기본값을 미리보기 중. 새 사진을 올리면 대체됩니다.
              </p>
            </div>
          ) : (
            <div className="aspect-[16/6] w-full rounded-md border-2 border-dashed bg-muted/30" />
          )}

          <form action={uploadLocaleCover} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={base.id} />
            <input type="hidden" name="lng" value={activeLocale} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 sm:w-auto"
            />
            <Button type="submit" variant="brand">
              업로드
            </Button>
          </form>

          {lc?.coverImageUrl ? (
            <form action={removeLocaleCover}>
              <input type="hidden" name="id" value={base.id} />
              <input type="hidden" name="lng" value={activeLocale} />
              <button
                type="submit"
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                {LOCALE_LABELS[activeLocale].short} 대표 사진 제거 (fallback 으로 돌아감)
              </button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── Landing poster card ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <CardTitle className="text-base">
              랜딩 포스터 — {LOCALE_LABELS[activeLocale].short}
            </CardTitle>
          </div>
          <CardDescription>
            긴 세로 광고 이미지 (원장 소개·시술 설명·BEFORE/AFTER 등). 국가별로 카피·디자인이 다를 수 있으므로 언어마다 별도 업로드. 최대 10MB · 권장 1080×1620.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lc?.landingImageUrl ? (
            <div className="mx-auto max-w-md overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lc.landingImageUrl}
                alt={`현재 랜딩 포스터 (${LOCALE_LABELS[activeLocale].short})`}
                className="w-full"
              />
            </div>
          ) : fallbackLanding ? (
            <div className="mx-auto max-w-md overflow-hidden rounded-md border-2 border-dashed bg-muted opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fallbackLanding} alt="기본값 (fallback)" className="w-full" />
              <p className="border-t bg-background/80 px-3 py-1.5 text-[11px] text-muted-foreground">
                ⓘ 이 언어 전용 포스터가 없어서 기본값을 미리보기 중.
              </p>
            </div>
          ) : (
            <div className="mx-auto h-48 max-w-md rounded-md border-2 border-dashed bg-muted/30" />
          )}

          <form action={uploadLocaleLanding} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={base.id} />
            <input type="hidden" name="lng" value={activeLocale} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 sm:w-auto"
            />
            <Button type="submit" variant="brand">
              업로드
            </Button>
          </form>

          {lc?.landingImageUrl ? (
            <form action={removeLocaleLanding}>
              <input type="hidden" name="id" value={base.id} />
              <input type="hidden" name="lng" value={activeLocale} />
              <button
                type="submit"
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                {LOCALE_LABELS[activeLocale].short} 랜딩 이미지 제거
              </button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── Gallery card ───────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <CardTitle className="text-base">
              갤러리 — {LOCALE_LABELS[activeLocale].short} ({gallery.length})
            </CardTitle>
          </div>
          <CardDescription>
            병원 시설·진료실·BEFORE/AFTER 사진 등. 환자 포털 상세의 Hero 옆 4-up thumbnail strip 에 등록 순서대로 노출. 권장 1000×750.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((url, idx) => (
                <div key={url} className="relative overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`갤러리 이미지 ${idx + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <form action={removeLocaleGalleryImage} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={base.id} />
                    <input type="hidden" name="lng" value={activeLocale} />
                    <input type="hidden" name="url" value={url} />
                    <button
                      type="submit"
                      className="rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              아직 {LOCALE_LABELS[activeLocale].full} 갤러리 이미지가 없습니다.
              {base.galleryImageUrls.length > 0
                ? ` (기본 갤러리 ${base.galleryImageUrls.length}장이 fallback 으로 사용됩니다)`
                : null}
            </p>
          )}

          <form action={addLocaleGalleryImage} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={base.id} />
            <input type="hidden" name="lng" value={activeLocale} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 sm:w-auto"
            />
            <Button type="submit" variant="brand">
              <Plus className="mr-1 h-3.5 w-3.5" />
              추가
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-[11px] text-muted-foreground">
        💡 다른 언어 탭으로 이동하려면 상단 탭 스트립을 클릭. 미입력 언어는 다른 언어 / 기본값으로 자동 fallback 됩니다. 카테고리·의사 등 구조화 정보는 Agency 콘솔의 5단계 위저드 사용.
      </p>
    </div>
  );
}
