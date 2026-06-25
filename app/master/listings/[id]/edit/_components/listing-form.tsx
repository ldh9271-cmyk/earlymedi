'use client';

import { useState } from 'react';
import {
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  TRAVEL_PACKAGE_SUB_TYPES,
  HOSPITAL_SUB_TYPES,
  type ListingStatus,
} from '@/lib/listings/categories';

const STATUS_LABELS_KR: Record<ListingStatus, string> = {
  draft: '임시저장 (draft)',
  pending: '검수 대기 (pending)',
  approved: '승인 완료 (approved)',
  rejected: '반려 (rejected)',
};

/**
 * Master listing edit form — client-side because the category-specific
 * fields render conditionally on the chosen category. All writes go
 * through server actions so we don't need fetch/state-syncing here;
 * the form just serializes the dynamic `details` block into a hidden
 * `detailsJson` field on submit.
 *
 * Field design follows the founder's "단순하게 등록" principle —
 * each category surfaces only its 4–6 most-used fields. Anything
 * fancier (room inventory builder, multi-shot tier picker, etc.) is
 * deferred until real partners ask for it.
 */
export function ListingEditForm({
  listing,
  updateAction,
  uploadAction,
  removeGalleryAction,
}: {
  listing: {
    id: string;
    category: string;
    title: string;
    slug: string;
    status: string;
    locationLabel: string;
    priceWon: number | null;
    priceUnit: string;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    promoLabel: string;
    featured: boolean;
    sortOrder: number;
    rating: number | null;
    reviewsCount: number;
    description: string;
    interestKey: string;
    city: string;
    details: Record<string, unknown>;
  };
  updateAction: (formData: FormData) => Promise<void>;
  uploadAction: (formData: FormData) => Promise<void>;
  removeGalleryAction: (formData: FormData) => Promise<void>;
}): JSX.Element {
  const [details, setDetails] = useState<Record<string, unknown>>(listing.details);

  function setDetail(key: string, value: unknown): void {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid gap-6">
      {/* Image management — separate forms so cover/gallery upload
          don't have to share the main update submit. */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold">대표 이미지 · 갤러리</h2>
          <span className="text-[11px] text-muted-foreground">
            추천 — 대표 <strong className="font-medium text-foreground">1200 × 750 px</strong> (8:5, 권장 ≤ 300 KB) · 갤러리 <strong className="font-medium text-foreground">800 × 800 px</strong> (1:1, 권장 ≤ 200 KB) · WebP 권장 · 업로드 한도 10 MB
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-[200px,1fr]">
          <div>
            <div
              className="h-32 w-full overflow-hidden rounded-md border"
              style={{
                background: listing.coverImageUrl
                  ? `#f2f2f2 url(${listing.coverImageUrl}) center / cover`
                  : '#f7f7f7',
              }}
            />
            <form action={uploadAction} className="mt-2">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="purpose" value="cover" />
              <input
                type="file"
                name="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.currentTarget.files?.[0]) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="text-[11px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">파일 선택 시 자동 업로드 (최대 10MB)</p>
            </form>
          </div>
          <div>
            <div className="grid grid-cols-4 gap-2">
              {listing.galleryImageUrls.map((url) => (
                <div key={url} className="relative">
                  <div
                    className="aspect-square overflow-hidden rounded border"
                    style={{ background: `#f2f2f2 url(${url}) center / cover` }}
                  />
                  <form action={removeGalleryAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="url" value={url} />
                    <button
                      type="submit"
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={uploadAction} className="mt-3">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="purpose" value="gallery" />
              <input
                type="file"
                name="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.currentTarget.files?.[0]) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="text-[11px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">갤러리에 한 장씩 추가됩니다.</p>
            </form>
          </div>
        </div>
      </section>

      {/* 상품 상세 랜딩 이미지 — long-form banner image surfaced
          full-width on the public detail page between the hero gallery
          and the title. Single image (replaces previous). Stored in
          details.detailLandingImageUrl. */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold">상품 상세 랜딩 이미지</h2>
          <span className="text-[11px] text-muted-foreground">
            추천 — 가로 <strong className="font-medium text-foreground">1280 px</strong>,
            세로는 자유 (긴 상세 설명 배너) · WebP 권장 · 업로드 한도 10 MB
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-[260px,1fr]">
          <div>
            <div
              className="w-full overflow-hidden rounded-md border"
              style={{
                aspectRatio: (() => {
                  const url = (details.detailLandingImageUrl as string | undefined) ?? '';
                  return url ? 'auto' : '16/9';
                })(),
                background: (() => {
                  const url = (details.detailLandingImageUrl as string | undefined) ?? '';
                  return url
                    ? `#f2f2f2 url(${url}) center top / cover no-repeat`
                    : '#f7f7f7';
                })(),
                minHeight: 140,
              }}
            />
            <form action={uploadAction} className="mt-2">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="purpose" value="detail_landing" />
              <input
                type="file"
                name="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.currentTarget.files?.[0]) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="text-[11px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                파일 선택 시 자동 업로드 (최대 10MB) · 기존 이미지 교체
              </p>
            </form>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="mb-2">
              상세 페이지에서 hero 갤러리와 제목 사이에 가로 전체 폭으로 노출되는
              긴 배너 이미지입니다. 상품의 설명·일정·포함사항을 시각화한 디자인 이미지를
              올리면 사용자가 스크롤하면서 바로 정보를 확인할 수 있어요.
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>가로 폭은 1280 px 권장 (모바일에서는 자동으로 축소).</li>
              <li>세로 길이는 자유 — 너무 길면 사용자 이탈 위험이 있어요.</li>
              <li>주요 정보는 위쪽에 배치 (스크롤 없이 보이게).</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Main edit form */}
      <form action={updateAction} className="grid gap-6">
        <input type="hidden" name="id" value={listing.id} />
        {/* serialize the dynamic details map into a single hidden JSON
            field so the server action can JSON.parse it. */}
        <input type="hidden" name="detailsJson" value={JSON.stringify(details)} />

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">기본 정보</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="제목">
              <input
                name="title"
                defaultValue={listing.title}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="카테고리 (잠금)">
              <input
                value={LISTING_CATEGORIES.find((c) => c.key === listing.category)?.label ?? listing.category}
                disabled
                className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
              />
            </Field>
            <Field label="위치 라벨 (카드 노출)">
              <input
                name="locationLabel"
                defaultValue={listing.locationLabel}
                placeholder="강남 · ★ 4.9 / 명동 · ★★★★★"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="도시 (필터)">
              <input
                name="city"
                defaultValue={listing.city}
                placeholder="서울"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="가격 (원)">
              <input
                name="priceWon"
                type="number"
                min={0}
                step={1000}
                defaultValue={listing.priceWon ?? ''}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="가격 단위">
              <input
                name="priceUnit"
                defaultValue={listing.priceUnit}
                placeholder="박 / 세션 / 1인 / 코스"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="프로모 배지">
              <input
                name="promoLabel"
                defaultValue={listing.promoLabel}
                placeholder='"게스트 선호" / "예약 대행"'
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="문의 시 자동 선택될 카테고리">
              <input
                name="interestKey"
                defaultValue={listing.interestKey}
                placeholder="hotel / food / makeup / ..."
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
          </div>
          <Field label="설명" className="mt-3">
            <textarea
              name="description"
              defaultValue={listing.description}
              rows={4}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </Field>
        </section>

        {/* Category-specific section */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">카테고리별 상세</h2>
          <CategoryFields
            category={listing.category}
            details={details}
            setDetail={setDetail}
          />
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">노출 제어</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="상태">
              <select
                name="status"
                defaultValue={listing.status}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LISTING_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS_KR[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="정렬 (낮을수록 먼저)">
              <input
                name="sortOrder"
                type="number"
                defaultValue={listing.sortOrder}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="메인 노출 (featured)">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input type="checkbox" name="featured" defaultChecked={listing.featured} />
                <span>/kr 메인 페이지에 노출</span>
              </label>
            </Field>
            <Field label="평점 (×10 — 49 = 4.9)">
              <input
                name="rating"
                type="number"
                min={0}
                max={50}
                defaultValue={listing.rating ?? ''}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
            <Field label="리뷰 수">
              <input
                name="reviewsCount"
                type="number"
                min={0}
                defaultValue={listing.reviewsCount}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </Field>
          </div>
        </section>

        <button
          type="submit"
          className="self-end rounded-md bg-[#ff385c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          저장
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/**
 * Category-specific field clusters. Each block writes into `details`
 * via setDetail. Keep these focused — every extra field is friction
 * for partner onboarding.
 */
function CategoryFields({
  category,
  details,
  setDetail,
}: {
  category: string;
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  switch (category) {
    case 'hotel':
      return <HotelFields details={details} setDetail={setDetail} />;
    case 'restaurant':
    case 'food':
      return <RestaurantFields details={details} setDetail={setDetail} />;
    case 'personal_color':
      return <PersonalColorFields details={details} setDetail={setDetail} />;
    case 'hair':
    case 'makeup':
      return <BeautyMenuFields details={details} setDetail={setDetail} />;
    case 'photo_studio':
      return <PhotoStudioFields details={details} setDetail={setDetail} />;
    case 'kpop_tour':
      return <KpopTourFields details={details} setDetail={setDetail} />;
    case 'travel_package':
      return <TravelPackageFields details={details} setDetail={setDetail} />;
    case 'hospital':
      return <HospitalFields details={details} setDetail={setDetail} />;
    default:
      return (
        <p className="text-xs text-muted-foreground">
          이 카테고리에는 추가 필드가 정의되지 않았습니다.
        </p>
      );
  }
}

function HotelFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const stars = typeof details.stars === 'number' ? details.stars : 4;
  const amenities = Array.isArray(details.amenities) ? (details.amenities as string[]) : [];
  const toggle = (k: string) => {
    setDetail('amenities', amenities.includes(k) ? amenities.filter((a) => a !== k) : [...amenities, k]);
  };
  const allAmenities: Array<{ key: string; label: string }> = [
    { key: 'spa',       label: '스파' },
    { key: 'breakfast', label: '조식 뷔페' },
    { key: 'rooftop',   label: '루프탑' },
    { key: 'fitness',   label: '피트니스' },
    { key: 'pool',      label: '수영장' },
    { key: 'sauna',     label: '사우나' },
    { key: 'concierge', label: '컨시어지' },
    { key: 'parking',   label: '주차' },
  ];
  return (
    <div className="grid gap-3">
      <Field label="등급 (별)">
        <div className="flex gap-2">
          {[3, 4, 5].map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="hotel-stars"
                checked={stars === s}
                onChange={() => setDetail('stars', s)}
              />
              <span>{'★'.repeat(s)}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="어메니티">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {allAmenities.map((a) => (
            <label key={a.key} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={amenities.includes(a.key)}
                onChange={() => toggle(a.key)}
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

type MenuItem = { name: string; priceWon: number; durationMin?: number };

function MenuBuilder({
  menu,
  showDuration,
  onChange,
}: {
  menu: MenuItem[];
  showDuration?: boolean;
  onChange: (next: MenuItem[]) => void;
}): JSX.Element {
  const add = () => onChange([...menu, { name: '', priceWon: 0 }]);
  const update = (i: number, patch: Partial<MenuItem>) => {
    onChange(menu.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const remove = (i: number) => onChange(menu.filter((_, idx) => idx !== i));
  return (
    <div className="grid gap-2">
      {menu.map((m, i) => (
        <div key={i} className="grid grid-cols-[1fr,140px,80px,40px] gap-2">
          <input
            value={m.name}
            placeholder="메뉴/시술명"
            onChange={(e) => update(i, { name: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          />
          <input
            type="number"
            value={m.priceWon}
            placeholder="가격(원)"
            onChange={(e) => update(i, { priceWon: Number(e.target.value) || 0 })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          />
          {showDuration ? (
            <input
              type="number"
              value={m.durationMin ?? ''}
              placeholder="분"
              onChange={(e) => update(i, { durationMin: Number(e.target.value) || 0 })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          ) : <div />}
          <button
            type="button"
            onClick={() => remove(i)}
            className="h-9 rounded-md border text-xs text-red-600"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded-md border border-dashed px-3 py-1.5 text-xs"
      >
        + 메뉴 추가
      </button>
    </div>
  );
}

function RestaurantFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const menu = Array.isArray(details.menu) ? (details.menu as MenuItem[]) : [];
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="음식 종류">
          <input
            value={(details.cuisine as string) ?? ''}
            onChange={(e) => setDetail('cuisine', e.target.value)}
            placeholder="한식 / 일식 / 양식 ..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </Field>
        <Field label="FIT 예약 가능">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!details.fitReservation}
              onChange={(e) => setDetail('fitReservation', e.target.checked)}
            />
            <span>개인 예약 받음</span>
          </label>
        </Field>
        <Field label="그룹 예약 가능">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!details.groupReservation}
              onChange={(e) => setDetail('groupReservation', e.target.checked)}
            />
            <span>단체 예약 받음</span>
          </label>
        </Field>
      </div>
      <Field label="메뉴">
        <MenuBuilder menu={menu} onChange={(next) => setDetail('menu', next)} />
      </Field>
    </div>
  );
}

function PersonalColorFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const includes = Array.isArray(details.includes) ? (details.includes as string[]).join('\n') : '';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="소요 시간 (분)">
        <input
          type="number"
          value={(details.durationMin as number) ?? 90}
          onChange={(e) => setDetail('durationMin', Number(e.target.value) || 0)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="포함 사항 (줄바꿈 구분)" className="sm:col-span-2">
        <textarea
          value={includes}
          onChange={(e) =>
            setDetail(
              'includes',
              e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            )
          }
          rows={4}
          placeholder={`1:1 컨설턴트\n드레이핑 진단\n결과 리포트\n맞춤 컬러 가이드`}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </Field>
    </div>
  );
}

function BeautyMenuFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const menu = Array.isArray(details.menu) ? (details.menu as MenuItem[]) : [];
  return (
    <Field label="시술 메뉴 (이름 · 가격 · 소요 분)">
      <MenuBuilder menu={menu} showDuration onChange={(next) => setDetail('menu', next)} />
    </Field>
  );
}

function PhotoStudioFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="패키지명">
        <input
          value={(details.packageName as string) ?? ''}
          onChange={(e) => setDetail('packageName', e.target.value)}
          placeholder="프로필 화보 · 4 컷"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="컷 수">
        <input
          type="number"
          value={(details.shotCount as number) ?? 12}
          onChange={(e) => setDetail('shotCount', Number(e.target.value) || 0)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="헤어·메이크업 포함">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!details.hairMakeupIncluded}
            onChange={(e) => setDetail('hairMakeupIncluded', e.target.checked)}
          />
          <span>포함</span>
        </label>
      </Field>
    </div>
  );
}

function TravelPackageFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const subType = typeof details.subType === 'string' ? details.subType : '';
  const includes = Array.isArray(details.includes) ? (details.includes as string[]).join('\n') : '';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="여행 종류 (하위 카테고리)">
        <select
          value={subType}
          onChange={(e) => setDetail('subType', e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— 선택 —</option>
          {TRAVEL_PACKAGE_SUB_TYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </Field>
      <Field label="기간 (일수)">
        <input
          type="number"
          min={1}
          value={(details.durationDays as number) ?? ''}
          onChange={(e) => setDetail('durationDays', Number(e.target.value) || 0)}
          placeholder="4박 5일 → 5"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="출발 도시">
        <input
          value={(details.origin as string) ?? ''}
          onChange={(e) => setDetail('origin', e.target.value)}
          placeholder="인천 / 김포"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="최소 인원">
        <input
          type="number"
          min={1}
          value={(details.minPax as number) ?? 1}
          onChange={(e) => setDetail('minPax', Number(e.target.value) || 1)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="가이드 동행">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!details.guideIncluded}
            onChange={(e) => setDetail('guideIncluded', e.target.checked)}
          />
          <span>통역/인솔 가이드 포함</span>
        </label>
      </Field>
      <Field label="항공권 포함">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!details.flightIncluded}
            onChange={(e) => setDetail('flightIncluded', e.target.checked)}
          />
          <span>국제선 항공 포함</span>
        </label>
      </Field>
      <Field label="포함 사항 (줄바꿈 구분)" className="sm:col-span-2">
        <textarea
          value={includes}
          onChange={(e) =>
            setDetail(
              'includes',
              e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            )
          }
          rows={4}
          placeholder={`5성 호텔 4박\n전 일정 통역 가이드\n공항 픽업·샌딩\n4사 K팝 성지 입장권`}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </Field>
    </div>
  );
}

function KpopTourFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const visit = Array.isArray(details.visitHouses) ? (details.visitHouses as string[]) : [];
  const toggle = (h: string) =>
    setDetail('visitHouses', visit.includes(h) ? visit.filter((x) => x !== h) : [...visit, h]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="코스명">
        <input
          value={(details.courseName as string) ?? ''}
          onChange={(e) => setDetail('courseName', e.target.value)}
          placeholder="HYBE · SM · JYP · YG 4사 투어"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="소요 시간 (분)">
        <input
          type="number"
          value={(details.durationMin as number) ?? 200}
          onChange={(e) => setDetail('durationMin', Number(e.target.value) || 0)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="방문 사옥" className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {['HYBE', 'SM', 'JYP', 'YG'].map((h) => (
            <label key={h} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={visit.includes(h)} onChange={() => toggle(h)} />
              <span>{h}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="인솔자(가이드) 포함">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!details.guideIncluded}
            onChange={(e) => setDetail('guideIncluded', e.target.checked)}
          />
          <span>통역 가이드 동행</span>
        </label>
      </Field>
    </div>
  );
}

/**
 * 병원(hospital) 카테고리 — 진료과 sub-type + 대표 시술명 + 시술
 * 소요 시간 + 외국인 환자 통역 여부. partner_listings 테이블의
 * details JSONB 에 `subType` / `procedureName` / `durationMin` /
 * `interpreterIncluded` 키로 저장.
 *
 * 마스터 등록 정보는 마케팅 surface 용. 임상 데이터(KOIHA 등록,
 * 환자 RLS, 진료 차트)는 별도의 hospitals 테이블이 정본.
 */
function HospitalFields({
  details,
  setDetail,
}: {
  details: Record<string, unknown>;
  setDetail: (key: string, value: unknown) => void;
}): JSX.Element {
  const subType = typeof details.subType === 'string' ? details.subType : '';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="진료과 (하위 카테고리)">
        <select
          value={subType}
          onChange={(e) => setDetail('subType', e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— 선택 —</option>
          {HOSPITAL_SUB_TYPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </Field>
      <Field label="대표 시술 / 프로그램명">
        <input
          value={(details.procedureName as string) ?? ''}
          onChange={(e) => setDetail('procedureName', e.target.value)}
          placeholder="예: 보톡스 · 라식 · 임플란트"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="소요 시간 (분)">
        <input
          type="number"
          min={0}
          value={(details.durationMin as number) ?? ''}
          onChange={(e) => setDetail('durationMin', Number(e.target.value) || 0)}
          placeholder="60"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </Field>
      <Field label="외국인 환자 통역">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!details.interpreterIncluded}
            onChange={(e) => setDetail('interpreterIncluded', e.target.checked)}
          />
          <span>전담 통역 포함 (EN / 中 / 日 / 露)</span>
        </label>
      </Field>
    </div>
  );
}
