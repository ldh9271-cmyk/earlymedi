import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, Image as ImageIcon, Plus, X } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import {
  updateHospitalBasics,
  uploadCoverImage,
  removeCoverImage,
  addGalleryImage,
  removeGalleryImage,
} from './_action';

export const metadata = { title: '병원 사진·소개 편집 · 마스터' };
export const dynamic = 'force-dynamic';

export default async function MasterHospitalEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/master/hospitals/${params.id}/edit`);
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const [row] = await db
    .select({
      id: hospitals.id,
      name: hospitals.name,
      slug: hospitals.slug,
      countryCode: hospitals.countryCode,
      coverImageUrl: hospitals.coverImageUrl,
      galleryImageUrls: hospitals.galleryImageUrls,
      notes: hospitals.notes,
      orgName: organizations.name,
    })
    .from(hospitals)
    .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
    .where(eq(hospitals.id, params.id))
    .limit(1);
  if (!row) notFound();

  const gallery = ((row.galleryImageUrls ?? []) as string[]) ?? [];

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
          마스터 전용 · 빠른 편집
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{row.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.orgName} · {row.countryCode}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          slug: <code className="rounded bg-muted px-1 font-mono">{row.slug}</code>
          <Link
            href={`/kr/clinics/${row.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 text-brand-700 hover:text-brand-900"
          >
            환자 포털에서 보기
            <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </header>

      {searchParams.saved ? (
        <div className="mb-4 rounded-md border border-care-300 bg-care-50 p-3 text-xs text-care-900">
          ✅ 저장되었습니다. 환자 포털에 즉시 반영됩니다.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          ⚠ {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {/* ─── Cover image card ───────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <CardTitle className="text-base">대표 사진 (Hero)</CardTitle>
          </div>
          <CardDescription>
            환자 포털 상세 페이지 상단 16:6 영역에 노출. 최대 10MB · 권장 가로 1680px 이상.
            갤러리 첫 4장이 Hero 옆 thumbnail strip 으로 함께 표시되니, 사진을 여러 장 등록할수록 풍부해 보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {row.coverImageUrl ? (
            <div className="overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.coverImageUrl}
                alt="현재 대표 사진"
                className="aspect-[16/6] w-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/6] w-full rounded-md border-2 border-dashed bg-muted/30" />
          )}

          <form action={uploadCoverImage} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
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

          {row.coverImageUrl ? (
            <form action={removeCoverImage}>
              <input type="hidden" name="id" value={row.id} />
              <button
                type="submit"
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                대표 사진 제거
              </button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── About text card ───────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">병원 소개 텍스트</CardTitle>
          <CardDescription>
            환자 포털 상세 페이지의 &quot;오늘의 추천 병원&quot; 섹션에 표시.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateHospitalBasics} className="space-y-3">
            <input type="hidden" name="id" value={row.id} />
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="sr-only">
                소개 텍스트
              </Label>
              <textarea
                id="notes"
                name="notes"
                rows={8}
                defaultValue={row.notes ?? ''}
                placeholder="예) 강남 한복판에 위치한 30년 전통의 성형외과. 코·눈·안면윤곽 분야에서 외국인 환자 누적 3,000명 이상. 영어·중국어·일본어 통역사 상주."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                줄바꿈은 그대로 유지됩니다.
              </p>
            </div>
            <Button type="submit" variant="brand">
              소개 저장
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Gallery card ───────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <CardTitle className="text-base">갤러리 이미지 ({gallery.length})</CardTitle>
          </div>
          <CardDescription>
            병원 시설·진료실·전후 사진 등을 여러 장 등록할 수 있습니다. 환자 포털
            상세 페이지의 갤러리 섹션에 등록 순서대로 노출됩니다.
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
                  <form action={removeGalleryImage} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={row.id} />
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
              아직 등록된 갤러리 이미지가 없습니다.
            </p>
          )}

          <form action={addGalleryImage} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
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
        💡 더 상세한 정보(시술 카테고리·의사·수수료 정책 등)는 Agency 콘솔의 5단계
        위저드에서 편집합니다. /master/hospitals 에서 행 &quot;열기&quot; 클릭 → 해당
        Agency 로 진입.
      </p>
    </div>
  );
}
