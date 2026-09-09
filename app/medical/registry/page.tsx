import Link from 'next/link';
import { eq, ilike } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { hospitalRegistry, type RegistryHours } from '@/drizzle/schema/hospital-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { chooseSelfModeAction, claimHospitalFromConsoleAction, requestAgencyAction, saveRegistryProfileAction } from './_actions';
import { REGISTRY_LANGS } from './langs';
import { REGISTRY_AGENCY_FEE_WON } from '@/lib/registry/agency';
import { profileCompleteness } from '@/lib/registry/submission';
import { parseRange, fmtHM } from '@/lib/hours/status';
import HoursBulkApply from '@/components/shared/hours-bulk-apply';
import AgencyPayButton from './_components/agency-pay';

export const metadata = { title: '병원 공개 정보' };
export const dynamic = 'force-dynamic';

const OK_MSG: Record<string, string> = {
  claimed: '연결 요청을 보냈습니다. 아래에서 병원 정보를 채우고 검수를 요청하면 승인과 함께 게시됩니다.',
  self: '직접 등록을 선택했습니다. 아래 양식을 채우고 "검수 요청" 을 눌러 주세요.',
  agency: '대행 인보이스를 발행했습니다. 결제가 확인되면 담당자가 연락드립니다.',
  paid: '대행비 결제가 확인되었습니다. 담당자가 1~2 영업일 내 연락드리며, 아래에 자료를 올려 두시면 더 빨리 진행됩니다.',
  saved: '저장했습니다 (임시 저장). 검수 요청 전까지는 공개 페이지에 반영되지 않습니다.',
  submitted: '검수를 요청했습니다. 관리자가 1~2 영업일 내 확인해 승인하면 정식 게시됩니다.',
};

/**
 * 의료기관 콘솔 — 병원 공개 정보 (자체 등록).
 *  1) 연결된 병원이 없으면 심평원 레지스트리에서 찾아 연결
 *  2) 등록 방식 선택: 직접 등록(무료) / 플랫폼 대행(대행비 결제)
 *  3) 글로우 인증 상세와 같은 구조의 양식 + 대표·추가 사진 업로드 + 사업자등록증·유치기관 등록증 첨부
 *  4) 검수 요청 → 관리자 1~2 영업일 내 승인 → 정식 게시
 */
export default async function MedicalRegistryPage({ searchParams }: { searchParams: { ok?: string; error?: string; q?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const [row] = await db.select().from(hospitalRegistry).where(eq(hospitalRegistry.claimOrgId, ctx.orgId)).limit(1);
  const q = (searchParams.q ?? '').trim();
  const found = !row && q
    ? await db.select({ id: hospitalRegistry.id, name: hospitalRegistry.name, clName: hospitalRegistry.clName, addr: hospitalRegistry.addr, claimStatus: hospitalRegistry.claimStatus, tel: hospitalRegistry.tel })
      .from(hospitalRegistry).where(ilike(hospitalRegistry.name, `%${q.replace(/[%_]/g, '')}%`)).limit(20)
    : [];

  const d = row?.details ?? {};
  const p = d.profile ?? {};
  const sub = d.submission;
  const agency = d.agency;
  const needMode = Boolean(row) && !sub?.mode && sub?.status !== 'approved';
  const hw: RegistryHours = p.hoursWeekly ?? d.hours ?? {};
  const toHM = (v?: string): string => (v && /^\d{4}$/.test(v) ? `${v.slice(0, 2)}:${v.slice(2)}` : '');
  const lunch = parseRange(hw.lunchWeek);
  const completeness = row ? profileCompleteness(d) : { ok: false, missing: [] };
  const input = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
  const area = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
  const label = 'mb-1 block text-xs font-medium';
  const hint = 'mt-1 text-[11px] text-muted-foreground';
  const timeInput = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

  const statusBadge = !row ? null
    : sub?.status === 'approved' ? <Badge variant="care">승인 · 게시 중</Badge>
      : sub?.status === 'submitted' ? <Badge variant="hospitality">검수 대기 (1~2 영업일)</Badge>
        : sub?.status === 'rejected' ? <Badge variant="destructive">보완 요청</Badge>
          : <Badge variant="outline">작성 중</Badge>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">병원 공개 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글로우업투어 <Link href="/kr/clinics/all" className="underline">전국 병원 찾기</Link>에 노출되는 내 병원 정보입니다.
          주소·전화·진료과목은 건강보험심사평가원 데이터로 자동 갱신되고, 소개·시술·의료진·사진·서류는 여기서 등록해 검수 후 게시됩니다.
        </p>
      </div>

      {searchParams.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">{searchParams.error}</p> : null}
      {searchParams.ok && OK_MSG[searchParams.ok] ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{OK_MSG[searchParams.ok]}</p> : null}

      {!row ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1단계 · 우리 병원 찾기</CardTitle>
            <CardDescription className="text-xs">심평원 개설 신고 명칭으로 검색해 우리 병원을 이 계정에 연결합니다. 연결하면 주소·전화·진료과목·진료시간이 자동으로 채워집니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="병원명으로 검색 (예: ○○의원)" className={input} />
              <Button type="submit" variant="outline">검색</Button>
            </form>
            {found.length > 0 ? (
              <ul className="divide-y rounded-md border text-sm">
                {found.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium">{h.name} <span className="text-xs text-muted-foreground">{h.clName}</span></div>
                      <div className="truncate text-xs text-muted-foreground">{h.addr} {h.tel ? `· ${h.tel}` : ''}</div>
                    </div>
                    {h.claimStatus === 'pending' || h.claimStatus === 'approved' ? (
                      <span className="text-xs text-muted-foreground">다른 조직이 연결</span>
                    ) : (
                      <form action={claimHospitalFromConsoleAction}>
                        <input type="hidden" name="registryId" value={h.id} />
                        <Button type="submit" size="sm" variant="brand">우리 병원으로 연결</Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : q ? <p className="text-xs text-muted-foreground">검색 결과가 없습니다. 개설 신고 명칭(예: ○○의원)으로 검색해 보세요.</p> : null}
            <Link href="/kr/clinics/all" className="text-xs underline">전국 병원 찾기에서 찾기 →</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">{row.name}</CardTitle>
                <div className="flex items-center gap-2">{statusBadge}</div>
              </div>
              <CardDescription className="text-xs">
                {row.clName} · {row.addr} · {row.tel ?? '전화 미등록'}{row.foreignLicensed ? ' · 외국인환자 유치기관' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              공개 페이지: <Link href={`/kr/clinics/r/${encodeURIComponent(row.ykiho)}`} className="underline">/kr/clinics/r/…</Link>
              {' · '}심평원 동기화 {new Date(row.syncedAt).toLocaleDateString('ko-KR')}
              {sub?.status === 'rejected' && sub.reviewNote ? <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">보완 요청 사유: {sub.reviewNote}</div> : null}
              {sub?.status === 'submitted' ? <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">검수 대기 중입니다 ({sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ko-KR') : ''}). 관리자가 1~2 영업일 내 승인하면 정식 게시됩니다. 수정 후 다시 저장하면 최신 내용으로 검수합니다.</div> : null}
            </CardContent>
          </Card>

          {/* 등록 방식 선택 */}
          {needMode ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">등록 방식을 선택해 주세요</CardTitle>
                <CardDescription className="text-xs">두 방식 모두 관리자 검수(1~2 영업일) 후 전국 병원 찾기에 컬러 카드로 정식 게시됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-bold">직접 등록 · 무료</div>
                  <p className="mt-1 text-xs text-muted-foreground">아래 양식에 소개·대표 시술·의료진·사진을 직접 입력하고 사업자등록증을 첨부한 뒤 검수를 요청합니다.</p>
                  <form action={chooseSelfModeAction} className="mt-3"><Button type="submit" variant="outline">직접 등록하기</Button></form>
                </div>
                <div className="rounded-lg border border-[#ffd7de] bg-[#fff8f9] p-4">
                  <div className="text-sm font-bold">플랫폼 대행 · ₩{REGISTRY_AGENCY_FEE_WON.toLocaleString('ko-KR')}</div>
                  <p className="mt-1 text-xs text-muted-foreground">대행비를 결제하면 담당자가 연락해 홈페이지·자료를 바탕으로 소개·시술·의료진·사진을 대신 구성하고 검수까지 진행합니다. 사진과 사업자등록증만 올려 주시면 됩니다.</p>
                  <form action={requestAgencyAction} className="mt-3"><Button type="submit" variant="brand">대행 신청하기</Button></form>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* 대행 상태 / 결제 */}
          {sub?.mode === 'agency' && sub.status !== 'approved' ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">플랫폼 대행 {agency?.paidAt ? '· 진행 중' : '· 결제 대기'}</CardTitle>
                <CardDescription className="text-xs">
                  {agency?.paidAt
                    ? `대행비 결제 확인 ${new Date(agency.paidAt).toLocaleString('ko-KR')} · 담당자가 1~2 영업일 내 연락드립니다. 아래 양식에 사진·서류를 올려 두시면 바로 착수합니다.`
                    : `인보이스 ${agency?.invoiceNo ?? ''} · 대행비 ₩${(agency?.amountWon ?? REGISTRY_AGENCY_FEE_WON).toLocaleString('ko-KR')} (카드·간편결제). 결제가 확인되면 담당자가 연락드립니다.`}
                </CardDescription>
              </CardHeader>
              {!agency?.paidAt && agency?.invoiceNo ? (
                <CardContent className="flex flex-wrap items-center gap-4">
                  <AgencyPayButton invoiceNo={agency.invoiceNo} amountWon={agency.amountWon} email={ctx.email} hospitalName={row.name} />
                  <form action={chooseSelfModeAction}><Button type="submit" variant="ghost" size="sm">대행 대신 직접 등록으로 바꾸기</Button></form>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {/* 등록 양식 */}
          {sub?.mode || sub?.status === 'approved' ? (
            <form action={saveRegistryProfileAction} className="space-y-6" encType="multipart/form-data">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">기본 소개</CardTitle>
                  <CardDescription className="text-xs">글로우 인증 병원 상세 페이지와 같은 구성으로 노출됩니다. 의료광고 규정상 최상급 표현(최고·1위·유일 등)과 치료 효과 보장 문구는 쓰지 않습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><label className={label} htmlFor="tagline">한 줄 소개</label><input id="tagline" name="tagline" defaultValue={p.tagline ?? ''} placeholder="예) 피부과 전문의가 탈모 치료와 모발이식을 진료하는 의원" className={input} /></div>
                  <div><label className={label} htmlFor="intro">병원 소개 (50~2,000자)</label><textarea id="intro" name="intro" rows={7} defaultValue={p.intro ?? ''} className={area} placeholder="진료 분야, 외국인 환자 응대 방식, 통역 지원, 위치와 접근성 등을 담아 주세요." /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className={label} htmlFor="website">공식 홈페이지</label><input id="website" name="website" defaultValue={p.website ?? ''} placeholder="https://" className={input} /></div>
                    <div><label className={label} htmlFor="station">오시는 길</label><input id="station" name="station" defaultValue={p.station ?? ''} placeholder="예) 강남역 1번 출구 도보 3분" className={input} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">진료시간</CardTitle>
                  <CardDescription className="text-xs">상세 페이지의 『진료 중 / 진료 종료』 배지가 이 요일별 시간으로 계산됩니다. 심평원 값이 미리 채워져 있으니 다르면 고쳐 주세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <HoursBulkApply />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day, i) => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-sm font-semibold">{['월', '화', '수', '목', '금', '토', '일'][i]}</span>
                        <input type="time" name={`${day}_s`} defaultValue={toHM(hw[day]?.[0])} className={timeInput} />
                        <span className="text-muted-foreground">~</span>
                        <input type="time" name={`${day}_e`} defaultValue={toHM(hw[day]?.[1])} className={timeInput} />
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className={label}>점심시간</span>
                      <div className="flex items-center gap-2">
                        <input type="time" name="lunch_s" defaultValue={lunch ? fmtHM(lunch[0]) : ''} className={timeInput} /><span className="text-muted-foreground">~</span>
                        <input type="time" name="lunch_e" defaultValue={lunch ? fmtHM(lunch[1]) : ''} className={timeInput} />
                      </div>
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="lunchSatToo" defaultChecked={Boolean(hw.lunchSat) || !hw.lunchWeek} /> 토요일에도 적용</label>
                    </div>
                    <div>
                      <span className={label}>공휴일</span>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="closedHoliday" defaultChecked={(hw.closedHoliday ?? 'Y') !== 'N'} /> 공휴일 휴진</label>
                      <input name="hoursText" defaultValue={p.hoursText ?? ''} placeholder="안내 문장 (선택) 예) 평일 10:00~19:00 · 토 10:00~15:00 · 점심 13:00~14:00" className={`${input} mt-2`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">대표 시술 · 진료 분야 · 의료진</CardTitle>
                  <CardDescription className="text-xs">한 줄에 하나씩 적습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><label className={label} htmlFor="signature">대표 시술 (최대 12)</label><textarea id="signature" name="signature" rows={3} defaultValue={(p.signatureProcedures ?? []).join('\n')} className={area} placeholder={'모발이식\n탈모 약물 치료\n두피 관리'} /></div>
                  <div><label className={label} htmlFor="departments">진료 분야 — 『분야: 세부항목 · 세부항목』</label><textarea id="departments" name="departments" rows={4} defaultValue={(p.departments ?? []).map((x) => `${x.title}: ${x.items.join(' · ')}`).join('\n')} className={area} placeholder={'모발이식: 비절개 · 절개 · 헤어라인 교정\n탈모 치료: 진단 · 약물 처방 · 두피 주사'} /></div>
                  <div><label className={label} htmlFor="doctors">의료진 — 『이름 | 직함·전문의』</label><textarea id="doctors" name="doctors" rows={3} defaultValue={(p.doctors ?? []).map((x) => `${x.name} | ${x.role}`).join('\n')} className={area} placeholder={'홍길동 대표원장 | 피부과 전문의'} /></div>
                  <div><label className={label} htmlFor="facilities">시설·안전 (한 줄에 하나)</label><textarea id="facilities" name="facilities" rows={3} defaultValue={(p.facilities ?? []).join('\n')} className={area} placeholder={'수술실 · 회복실\n주차 가능\n엘리베이터'} /></div>
                  <div><label className={label} htmlFor="trust">신뢰 포인트 (한 줄에 하나, 최대 10)</label><textarea id="trust" name="trust" rows={3} defaultValue={(p.trust ?? []).join('\n')} className={area} placeholder={'피부과 전문의 진료\n강남역 도보 3분\n평일 야간 진료'} /></div>
                  <div><label className={label} htmlFor="notice">안내 문구 (의료광고 준수 — 효과 개인차 등)</label><textarea id="notice" name="notice" rows={2} defaultValue={p.notice ?? ''} className={area} placeholder="시술 결과는 개인차가 있으며 부작용이 발생할 수 있습니다. 시술 방법은 진단과 상담을 통해 결정됩니다." /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">외국인 진료</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs">
                    <span className={label}>진료 가능 언어</span>
                    <div className="flex flex-wrap gap-3">
                      {REGISTRY_LANGS.map((l) => (
                        <label key={l} className="flex items-center gap-1.5"><input type="checkbox" name={`lang_${l}`} defaultChecked={(d.languages ?? []).includes(l)} /> {l}</label>
                      ))}
                    </div>
                  </div>
                  <div><label className={label} htmlFor="foreignNote">외국인 환자 안내</label><input id="foreignNote" name="foreignNote" defaultValue={p.foreignNote ?? ''} placeholder="예) 영어·중국어 코디네이터 상주, 사후관리 화상 상담 가능" className={input} /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">사진</CardTitle>
                  <CardDescription className="text-xs">대표(썸네일) 사진 1장 + 추가 사진 최대 12장. JPG·PNG·WebP, 장당 10MB 이하, 가로 사진 권장.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className={label}>대표 사진 (썸네일)</span>
                    {p.cover ? (
                      <div className="mb-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.cover} alt="대표 사진" className="h-24 w-40 rounded-md border object-cover" />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" name="removeCover" /> 삭제</label>
                      </div>
                    ) : null}
                    <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" className="text-sm" />
                    <p className={hint}>새 파일을 올리면 기존 대표 사진을 대체합니다.</p>
                  </div>
                  <div>
                    <span className={label}>추가 사진 ({(p.photos ?? []).length}/12)</span>
                    {(p.photos ?? []).length ? (
                      <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {(p.photos ?? []).map((u) => (
                          <label key={u} className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="aspect-[4/3] w-full rounded-md border object-cover" />
                            <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" name="removePhoto" value={u} /> 삭제</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <input type="file" name="gallery" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">서류 첨부 (검수용 · 비공개)</CardTitle>
                  <CardDescription className="text-xs">PDF·JPG·PNG, 10MB 이하. 공개 페이지에는 노출되지 않고 관리자 검수에만 쓰입니다.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className={label}>사업자등록증 <span className="text-destructive">*</span></span>
                    {d.docs?.businessLicense ? <p className="mb-1 text-xs text-emerald-700">첨부됨 · {d.docs.businessLicense.name} ({Math.round(d.docs.businessLicense.size / 1024)}KB)</p> : null}
                    <input type="file" name="businessLicense" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
                  </div>
                  <div>
                    <span className={label}>외국인환자 유치의료기관 등록증 {row.foreignLicensed ? '(유치기관)' : '(해당 시)'}</span>
                    {d.docs?.foreignPatientCert ? <p className="mb-1 text-xs text-emerald-700">첨부됨 · {d.docs.foreignPatientCert.name} ({Math.round(d.docs.foreignPatientCert.size / 1024)}KB)</p> : null}
                    <input type="file" name="foreignCert" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-4">
                  <Button type="submit" name="intent" value="draft" variant="outline">임시 저장</Button>
                  <Button type="submit" name="intent" value="submit" variant="brand">{sub?.status === 'approved' ? '수정 저장 후 재검수 요청' : '검수 요청'}</Button>
                  <span className="text-xs text-muted-foreground">
                    {completeness.ok ? '필수 항목이 모두 채워졌습니다.' : `검수 요청 필수: ${completeness.missing.join(', ')}`}
                    {' · '}관리자가 1~2 영업일 내 검수·승인하면 정식 게시됩니다.
                  </span>
                </CardContent>
              </Card>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
