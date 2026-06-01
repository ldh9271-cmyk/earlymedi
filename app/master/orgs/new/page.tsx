import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { createOrgAsMasterFormAction } from '../../_actions/create-org';

export const metadata = { title: '신규 조직 등록 · 마스터' };
export const dynamic = 'force-dynamic';

/**
 * Master-only: bulk create new organizations across the 4 actor types.
 *
 * Why a separate page (vs. the public /signup wizard):
 *   - Pre-launch ops: the founder wants to seed dozens of partner
 *     hospitals/agencies/freelancers before any of them know the
 *     platform exists. Forcing each to self-signup blocks rollout.
 *   - No auth.users row required — the org is "orphan" until the
 *     real owner joins, at which point a merge job (Phase 2+) pairs
 *     them by `ownerInviteEmail`.
 *   - Skips billing — the receiving owner picks a plan on first login.
 */
export default async function MasterNewOrgPage({
  searchParams,
}: {
  searchParams: { error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/orgs/new');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/master"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        마스터 콘솔로
      </Link>

      <header className="my-6">
        <Badge variant="destructive" className="mb-2">
          마스터 전용
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">신규 조직 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          4 액터 (의료기관·유치업체·파트너업체·프리랜서) 의 조직을 마스터 권한으로
          직접 생성합니다. 오너 사용자 없이 우선 생성하고, 추후 owner 이메일로 초대.
        </p>
      </header>

      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">조직 정보</CardTitle>
          <CardDescription>
            필수: 액터 타입 · 이름. 나머지는 추후 owner 가 채워도 OK.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrgAsMasterFormAction} className="space-y-4">
            {/* Account type */}
            <div className="space-y-1.5">
              <Label htmlFor="accountType">액터 타입 *</Label>
              <select
                id="accountType"
                name="accountType"
                required
                defaultValue="medical"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="medical">의료기관 (Medical)</option>
                <option value="agency">유치업체 (Agency)</option>
                <option value="non_medical">파트너업체 (Non-Medical)</option>
                <option value="freelancer">프리랜서 (Freelancer)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                의료기관 = 병원·의원, 유치업체 = 외국인환자 유치업자, 파트너 = 호텔·스파·식당 등
              </p>
            </div>

            {/* Partner subtype (only when non_medical) */}
            <div className="space-y-1.5">
              <Label htmlFor="partnerSubtype">파트너 세부 분류 (Partner 만)</Label>
              <select
                id="partnerSubtype"
                name="partnerSubtype"
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— 해당 없음 (의료기관·유치업체·프리랜서) —</option>
                <option value="hotel">회복호텔 (Hotel)</option>
                <option value="spa">스파 (Spa)</option>
                <option value="salon">미용실 (Salon)</option>
                <option value="studio">사진 스튜디오 (Studio)</option>
                <option value="restaurant">식당 (Restaurant)</option>
                <option value="transport">교통·픽업 (Transport)</option>
                <option value="tour">관광 (Tour)</option>
                <option value="shopping">쇼핑 (Shopping)</option>
                <option value="wellness">웰니스 (Wellness)</option>
                <option value="other">기타 (Other)</option>
              </select>
            </div>

            <hr />

            {/* Names */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">조직명 *</Label>
                <Input id="name" name="name" required placeholder="강남 K뷰티 의원" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legalName">법인명</Label>
                <Input id="legalName" name="legalName" placeholder="의료법인 K뷰티" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="representativeName">대표자</Label>
                <Input id="representativeName" name="representativeName" placeholder="홍길동" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="countryCode">국가 (ISO 2자)</Label>
                <Input
                  id="countryCode"
                  name="countryCode"
                  defaultValue="KR"
                  maxLength={2}
                  className="uppercase"
                />
              </div>
            </div>

            <hr />

            {/* License numbers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="businessRegistrationNumber">사업자등록번호</Label>
                <Input
                  id="businessRegistrationNumber"
                  name="businessRegistrationNumber"
                  placeholder="123-45-67890"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="foreignPatientLicenseNumber">외국인환자 유치업 번호</Label>
                <Input
                  id="foreignPatientLicenseNumber"
                  name="foreignPatientLicenseNumber"
                  placeholder="FP-2024-XXXX"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medicalLicenseNumber">의료기관 개설신고증 (의료기관 만)</Label>
              <Input
                id="medicalLicenseNumber"
                name="medicalLicenseNumber"
                placeholder="MED-2024-XXXX"
                className="font-mono"
              />
            </div>

            <hr />

            {/* Owner invite */}
            <div className="space-y-1.5">
              <Label htmlFor="ownerInviteEmail">오너 이메일 (선택)</Label>
              <Input
                id="ownerInviteEmail"
                name="ownerInviteEmail"
                type="email"
                placeholder="owner@example.com"
              />
              <p className="text-[11px] text-muted-foreground">
                입력 시 이 이메일이 추후 자가 가입하면 자동으로 이 조직의 owner 로 연결됩니다. (Phase 2+ 매칭 잡)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button type="submit" variant="brand">
                조직 생성
              </Button>
              <Link href="/master">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-[11px] text-muted-foreground">
        💡 조직 생성 후 /master 콘솔에서 새 카드를 클릭하면 그 조직의 사이드바로 진입해
        병원·시술·정책 등 세부 정보를 등록할 수 있습니다.
      </p>
    </div>
  );
}
