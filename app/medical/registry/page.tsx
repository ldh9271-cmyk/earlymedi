import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { saveRegistryProfileAction } from './_actions';
import { REGISTRY_LANGS } from './langs';

export const metadata = { title: '병원 공개 정보' };
export const dynamic = 'force-dynamic';

/**
 * 의료기관 콘솔 — 공개 병원 찾기에 노출되는 내 병원 정보.
 * 심평원 공공정보(주소·전화·진료시간)는 자동, 소개·언어·사진만 직접 입력.
 */
export default async function MedicalRegistryPage({ searchParams }: { searchParams: { ok?: string; error?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const [row] = await db
    .select()
    .from(hospitalRegistry)
    .where(eq(hospitalRegistry.claimOrgId, ctx.orgId))
    .limit(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">병원 공개 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글로우업투어 <Link href="/kr/clinics/all" className="underline">전국 병원 찾기</Link>에 노출되는 내 병원 정보입니다.
          주소·전화·진료시간·진료과목은 건강보험심사평가원 데이터로 자동 갱신되고, 소개·언어·사진은 여기서 직접 입력합니다.
        </p>
      </div>

      {searchParams.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">{searchParams.error}</p> : null}
      {searchParams.ok ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">저장했습니다. 공개 페이지에 바로 반영됩니다.</p> : null}

      {!row ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 병원이 없습니다</CardTitle>
            <CardDescription className="text-xs">
              전국 병원 찾기에서 우리 병원을 찾아 상세 화면의 <b>병원 정보 직접 등록</b>을 누르면 이 조직에 연결됩니다.
              이미 가입한 상태라면 그 화면에서 같은 이메일로 다시 진행해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/kr/clinics/all"><Button variant="brand">전국 병원 찾기 →</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{row.name}</CardTitle>
                <Badge variant={row.claimStatus === 'approved' ? 'care' : row.claimStatus === 'pending' ? 'hospitality' : 'outline'}>
                  {row.claimStatus === 'approved' ? '승인 · 컬러 노출' : row.claimStatus === 'pending' ? '마스터 승인 대기' : row.claimStatus}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {row.clName} · {row.addr} · {row.tel ?? '전화 미등록'}
                {row.foreignLicensed ? ' · 외국인 진료 가능' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              공개 페이지: <Link href={`/kr/clinics/r/${encodeURIComponent(row.ykiho)}`} className="underline">/kr/clinics/r/…</Link>
              {' · '}심평원 동기화 {new Date(row.syncedAt).toLocaleDateString('ko-KR')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">소개 · 언어 · 사진</CardTitle>
              <CardDescription className="text-xs">
                {row.claimStatus === 'approved' ? '저장하면 공개 상세 페이지에 바로 반영됩니다.' : '마스터 승인이 나면 편집할 수 있습니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveRegistryProfileAction} className="space-y-4">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">병원 소개 (2,000자)</span>
                  <textarea name="intro" rows={6} defaultValue={row.details.intro ?? ''} disabled={row.claimStatus !== 'approved'}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="진료 분야, 외국인 환자 응대 방식, 통역 지원 등을 담아 주세요. 의료광고 규정상 최상급 표현(최고·1위 등)은 쓰지 않습니다." />
                </label>
                <div className="text-xs">
                  <span className="mb-1 block font-medium">진료 가능 언어</span>
                  <div className="flex flex-wrap gap-3">
                    {REGISTRY_LANGS.map((l) => (
                      <label key={l} className="flex items-center gap-1.5">
                        <input type="checkbox" name={`lang_${l}`} defaultChecked={(row.details.languages ?? []).includes(l)} disabled={row.claimStatus !== 'approved'} /> {l}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">사진 URL (한 줄에 하나, 최대 12장 — 첫 장이 대표 이미지)</span>
                  <textarea name="photos" rows={4} defaultValue={(row.details.photos ?? []).join('\n')} disabled={row.claimStatus !== 'approved'}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" placeholder="https://…/lobby.jpg" />
                </label>
                <Button type="submit" variant="brand" disabled={row.claimStatus !== 'approved'}>저장</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
