import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, ImageIcon } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { updateHospitalBasics } from './_action';

export const metadata = { title: '병원 사진·소개 편집 · 마스터' };
export const dynamic = 'force-dynamic';

/**
 * Master-side quick edit page for the two patient-portal-visible
 * fields on a hospital row:
 *
 *   - coverImageUrl → hero image on /[locale]/clinics/[slug]
 *   - notes         → short bio shown in the "오늘의 추천 병원" section
 *
 * This is the minimal complement to the full Agency wizard. Letting
 * the master operator tweak just these two fields covers ~90% of
 * post-launch listing edits without re-running the 5-step flow.
 *
 * For richer fields (specialties / doctors / pricing) keep using the
 * Agency-side wizard at /agency/hospitals/[id].
 */
export default async function MasterHospitalEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
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
      notes: hospitals.notes,
      orgName: organizations.name,
    })
    .from(hospitals)
    .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
    .where(eq(hospitals.id, params.id))
    .limit(1);
  if (!row) notFound();

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">병원 대표 사진 + 소개</CardTitle>
          <CardDescription>
            환자 포털 병원 상세 페이지 (/[locale]/clinics/{row.slug}) 의 Hero 이미지와
            &quot;오늘의 추천 병원&quot; 섹션에 노출됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateHospitalBasics} className="space-y-4">
            <input type="hidden" name="id" value={row.id} />

            {/* Cover image */}
            <div className="space-y-1.5">
              <Label htmlFor="coverImageUrl">
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" />
                  대표 사진 URL
                </span>
              </Label>
              <Input
                id="coverImageUrl"
                name="coverImageUrl"
                type="url"
                defaultValue={row.coverImageUrl ?? ''}
                placeholder="https://example.com/clinic-cover.jpg"
              />
              <p className="text-[11px] text-muted-foreground">
                권장 비율 21:9, 가로 1680px 이상. 비워두면 그라데이션 placeholder 표시.
                <br />
                💡 이미지가 호스팅되어있는 URL 을 붙여넣으세요. (Imgur / Cloudinary / S3 / 본인 도메인 등)
              </p>
              {row.coverImageUrl ? (
                <div className="mt-2 overflow-hidden rounded-md border bg-muted">
                  {/* Preview — img tag to bypass next.config remotePatterns */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.coverImageUrl}
                    alt="현재 대표 사진 미리보기"
                    className="aspect-[21/9] w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            {/* About text */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">병원 소개 텍스트</Label>
              <textarea
                id="notes"
                name="notes"
                rows={8}
                defaultValue={row.notes ?? ''}
                placeholder="예) 강남 한복판에 위치한 30년 전통의 성형외과. 코·눈·안면윤곽 분야에서 외국인 환자 누적 3,000명 이상. 영어·중국어·일본어 통역사 상주."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                줄바꿈은 그대로 유지됩니다. 다국어 번역은 추후 자동 처리 예정 (현재는 한국어만).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" variant="brand">
                저장
              </Button>
              <Link href={`/master/hospitals`}>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-[11px] text-muted-foreground">
        💡 더 상세한 정보(시술 카테고리·의사·수수료 정책 등)는 Agency 콘솔의 5단계 위저드에서
        편집합니다. /master/hospitals 에서 행 &quot;열기&quot; 클릭 → 해당 Agency 로 진입.
      </p>
    </div>
  );
}
