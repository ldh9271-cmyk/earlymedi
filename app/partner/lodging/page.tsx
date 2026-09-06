import Link from 'next/link';
import { and, eq, ilike } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { REGISTRY_LANGS } from '@/app/medical/registry/langs';
import { claimStayFromConsoleAction, saveStayProfileAction } from './_actions';

export const metadata = { title: '숙소 공개 정보' };
export const dynamic = 'force-dynamic';

/** 파트너 콘솔 — 공개 전국 숙박 찾기에 노출되는 내 숙소(행안부 숙박업 레지스트리) 정보. */
export default async function PartnerLodgingPage({ searchParams }: { searchParams: { ok?: string; error?: string; q?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [row] = await db.select().from(lodgingRegistry).where(eq(lodgingRegistry.claimOrgId, ctx.orgId)).limit(1);
  const q = (searchParams.q ?? '').trim();
  const found = !row && q
    ? await db.select({ id: lodgingRegistry.id, name: lodgingRegistry.name, bizType: lodgingRegistry.bizType, addr: lodgingRegistry.addrRoad, claimStatus: lodgingRegistry.claimStatus, tel: lodgingRegistry.tel })
      .from(lodgingRegistry).where(and(ilike(lodgingRegistry.name, `%${q.replace(/[%_]/g, '')}%`), eq(lodgingRegistry.statusCode, '01'))).limit(20)
    : [];
  const editable = row?.claimStatus === 'approved';
  const rooms = row ? row.roomsKo + row.roomsWe : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">숙소 공개 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글로우업투어 <Link href="/kr/stays/all" className="underline">전국 숙박 찾기</Link>에 노출되는 내 숙소 정보입니다.
          상호·주소·업태·객실 수·영업상태는 지자체 인허가 데이터로 자동 갱신되고, 소개·체크인/아웃·편의시설·언어·사진은 여기서 직접 입력합니다.
        </p>
      </div>

      {searchParams.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">{searchParams.error}</p> : null}
      {searchParams.ok ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{searchParams.ok === 'claimed' ? '연결 요청을 보냈습니다. 마스터 승인 후 편집할 수 있습니다.' : '저장했습니다. 공개 페이지에 바로 반영됩니다.'}</p> : null}

      {!row ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 숙소가 없습니다</CardTitle>
            <CardDescription className="text-xs">전국 숙박 찾기에서 우리 숙소를 찾아 상세 화면의 <b>숙소 정보 직접 등록</b>을 누르면 이 조직에 연결됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="숙소 상호로 검색 (인허가 상호)" className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
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
                      <form action={claimStayFromConsoleAction}>
                        <input type="hidden" name="registryId" value={h.id} />
                        <Button type="submit" size="sm" variant="brand">우리 숙소로 연결</Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : q ? <p className="text-xs text-muted-foreground">검색 결과가 없습니다. 인허가 상호(사업자등록 상호)로 검색해 보세요.</p> : null}
            <p className="text-xs text-muted-foreground">연결하면 지자체 인허가 기본정보(상호·주소·업태·객실 수·전화)가 자동으로 채워지고, 마스터 승인 후 소개·체크인/아웃·편의시설·사진·언어를 입력해 상세 페이지를 구성할 수 있습니다.</p>
            <Link href="/kr/stays/all" className="text-xs underline">전국 숙박 찾기에서 찾기 →</Link>
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
              <CardDescription className="text-xs">{row.bizType} · {row.addrRoad ?? row.addrLot} · {row.tel ?? '전화 미등록'} · {rooms > 0 ? `객실 ${rooms}` : '객실 수 미등록'} · {row.statusName}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              공개 페이지: <Link href={`/kr/stays/r/${encodeURIComponent(row.mgtNo)}`} className="underline">/kr/stays/r/…</Link> · 인허가 데이터 동기화 {new Date(row.syncedAt).toLocaleDateString('ko-KR')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">소개 · 체크인/아웃 · 편의시설 · 언어 · 사진</CardTitle>
              <CardDescription className="text-xs">{editable ? '저장하면 공개 상세 페이지에 바로 반영됩니다.' : '마스터 승인이 나면 편집할 수 있습니다.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveStayProfileAction} className="space-y-4">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">숙소 소개 (2,000자)</span>
                  <textarea name="intro" rows={6} defaultValue={row.details.intro ?? ''} disabled={!editable} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="객실 구성, 주변 병원·관광지 접근성, 외국인 고객 응대(통역·영문 안내), 조식·셔틀 등을 담아 주세요." />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">체크인</span>
                    <input name="checkIn" defaultValue={row.details.checkIn ?? ''} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 15:00" />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">체크아웃</span>
                    <input name="checkOut" defaultValue={row.details.checkOut ?? ''} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 11:00" />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">가격 안내 (선택)</span>
                    <input name="priceNote" defaultValue={row.details.priceNote ?? ''} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 스탠다드 1박 90,000원부터" />
                  </label>
                </div>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">편의시설 (쉼표로 구분)</span>
                  <input name="amenities" defaultValue={(row.details.amenities ?? []).join(', ')} disabled={!editable} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="예) 무료 Wi-Fi, 조식, 주차, 공항 셔틀, 24시간 프런트" />
                </label>
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
                  <textarea name="photos" rows={4} defaultValue={(row.details.photos ?? []).join('\n')} disabled={!editable} className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" placeholder="https://…/room.jpg" />
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
