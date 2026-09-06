import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { REGISTRY_LANGS } from '@/app/medical/registry/langs';
import { claimShopFromConsoleAction, saveShopProfileAction } from './_actions';
import { and, ilike } from 'drizzle-orm';

export const metadata = { title: '매장 공개 정보' };
export const dynamic = 'force-dynamic';

/** 파트너 콘솔 — 공개 뷰티샵 찾기에 노출되는 내 매장(행안부 미용업 레지스트리) 정보. */
export default async function PartnerRegistryPage({ searchParams }: { searchParams: { ok?: string; error?: string; q?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [row] = await db.select().from(beautyRegistry).where(eq(beautyRegistry.claimOrgId, ctx.orgId)).limit(1);
  const q = (searchParams.q ?? '').trim();
  const found = !row && q
    ? await db.select({ id: beautyRegistry.id, name: beautyRegistry.name, bizType: beautyRegistry.bizType, addr: beautyRegistry.addrRoad, claimStatus: beautyRegistry.claimStatus, tel: beautyRegistry.tel })
      .from(beautyRegistry).where(and(ilike(beautyRegistry.name, `%${q.replace(/[%_]/g, '')}%`), eq(beautyRegistry.statusCode, '01'))).limit(20)
    : [];
  const editable = row?.claimStatus === 'approved';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">매장 공개 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글로우업투어 <Link href="/kr/shops/all" className="underline">전국 뷰티샵 찾기</Link>에 노출되는 내 매장 정보입니다.
          상호·주소·업태·영업상태는 지자체 인허가 데이터로 자동 갱신되고, 소개·언어·사진·영업시간은 여기서 직접 입력합니다.
        </p>
      </div>

      {searchParams.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">{searchParams.error}</p> : null}
      {searchParams.ok ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{searchParams.ok === 'claimed' ? '연결 요청을 보냈습니다. 마스터 승인 후 편집할 수 있습니다.' : '저장했습니다. 공개 페이지에 바로 반영됩니다.'}</p> : null}

      {!row ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 매장이 없습니다</CardTitle>
            <CardDescription className="text-xs">전국 뷰티샵 찾기에서 우리 매장을 찾아 상세 화면의 <b>매장 정보 직접 등록</b>을 누르면 이 조직에 연결됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="매장 상호로 검색 (인허가 상호)" className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
              <Button type="submit" variant="outline">검색</Button>
            </form>
            {found.length > 0 ? (
              <ul className="divide-y rounded-md border text-sm">
                {found.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium">{h.name} <span className="text-xs text-muted-foreground">{h.bizType}</span></div>
                      <div className="truncate text-xs text-muted-foreground">{h.addr} {h.tel ? `· ${h.tel}` : ''}</div>
                    </div>
                    {h.claimStatus === 'pending' || h.claimStatus === 'approved' ? (
                      <span className="text-xs text-muted-foreground">다른 조직이 연결</span>
                    ) : (
                      <form action={claimShopFromConsoleAction}>
                        <input type="hidden" name="registryId" value={h.id} />
                        <Button type="submit" size="sm" variant="brand">우리 매장으로 연결</Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : q ? <p className="text-xs text-muted-foreground">검색 결과가 없습니다. 인허가 상호(사업자등록 상호)로 검색해 보세요.</p> : null}
            <p className="text-xs text-muted-foreground">연결하면 지자체 인허가 기본정보(상호·주소·업태·전화)가 자동으로 채워지고, 마스터 승인 후 소개·영업시간·사진·언어를 입력해 상세 페이지를 구성할 수 있습니다.</p>
            <Link href="/kr/shops/all" className="text-xs underline">전국 뷰티샵 찾기에서 찾기 →</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{row.name}</CardTitle>
                <Badge variant={editable ? 'care' : row.claimStatus === 'pending' ? 'hospitality' : 'outline'}>
                  {editable ? '승인 · 컬러 노출' : row.claimStatus === 'pending' ? '마스터 승인 대기' : row.claimStatus}
                </Badge>
              </div>
              <CardDescription className="text-xs">{row.bizType} · {row.addrRoad ?? row.addrLot} · {row.tel ?? '전화 미등록'} · {row.statusName}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              공개 페이지: <Link href={`/kr/shops/r/${encodeURIComponent(row.mgtNo)}`} className="underline">/kr/shops/r/…</Link> · 인허가 데이터 동기화 {new Date(row.syncedAt).toLocaleDateString('ko-KR')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">소개 · 영업시간 · 언어 · 사진</CardTitle>
              <CardDescription className="text-xs">{editable ? '저장하면 공개 상세 페이지에 바로 반영됩니다.' : '마스터 승인이 나면 편집할 수 있습니다.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveShopProfileAction} className="space-y-4">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">매장 소개 (2,000자)</span>
                  <textarea name="intro" rows={6} defaultValue={row.details.intro ?? ''} disabled={!editable} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="시그니처 시술, 외국인 고객 응대(통역·영문 메뉴), 예약 방법 등을 담아 주세요." />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">영업시간</span>
                    <input name="hours" defaultValue={row.details.hours ?? ''} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 10:00–20:00 · 일요일 휴무" />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">가격 안내 (선택)</span>
                    <input name="priceNote" defaultValue={row.details.priceNote ?? ''} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 커트 35,000원부터 · 카드 결제 가능" />
                  </label>
                </div>
                <div className="text-xs">
                  <span className="mb-1 block font-medium">응대 가능 언어</span>
                  <div className="flex flex-wrap gap-3">
                    {REGISTRY_LANGS.map((l) => (
                      <label key={l} className="flex items-center gap-1.5">
                        <input type="checkbox" name={`lang_${l}`} defaultChecked={(row.details.languages ?? []).includes(l)} disabled={!editable} /> {l}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">사진 URL (한 줄에 하나, 최대 12장 — 첫 장이 대표 이미지)</span>
                  <textarea name="photos" rows={4} defaultValue={(row.details.photos ?? []).join('\n')} disabled={!editable} className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" placeholder="https://…/interior.jpg" />
                </label>
                <Button type="submit" variant="brand" disabled={!editable}>저장</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
