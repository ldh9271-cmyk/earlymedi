import { Stethoscope } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '리소스 (의사·룸)' };
export const dynamic = 'force-dynamic';

type HospitalDetails = {
  doctors?: Array<{ name?: string; role?: string }>;
  facilities?: string[];
  hours?: string;
  station?: string;
  foreignSupport?: { languages?: string[]; note?: string };
};

/**
 * 리소스 — 마켓플레이스에 게시된 우리 병원 리스팅의 의료진·시설 정보.
 * 리스팅 원본은 에이전시(플랫폼) 소유라 이 화면은 조회 전용이다 —
 * 수정이 필요하면 담당 매니저에게 요청하면 승인 후 반영된다.
 */
export default async function MedicalResourcesPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const rows = await withRls(ctx, () =>
    db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        details: hospitals.details,
        isActiveForMatching: hospitals.isActiveForMatching,
      })
      .from(hospitals)
      .where(eq(hospitals.linkedOrgId, ctx.orgId))
      .orderBy(hospitals.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">리소스 (의사·룸)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          마켓플레이스에 게시된 우리 병원 리스팅의 의료진·시설 정보입니다. 정보 수정은
          담당 매니저에게 요청하시면 검수 후 6개 언어 페이지에 함께 반영됩니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Stethoscope}
              title="연결된 병원 리스팅이 없습니다"
              description="글로우업투어 담당 매니저에게 병원 리스팅 연결을 요청해 주세요. 연결되면 의료진·시설 정보가 여기에 표시됩니다."
            />
          </CardContent>
        </Card>
      ) : (
        rows.map((h) => {
          const d = (h.details ?? {}) as HospitalDetails;
          const doctors = (d.doctors ?? []).filter((x) => x?.name);
          const facilities = d.facilities ?? [];
          return (
            <Card key={h.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{h.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {d.hours ? `진료 ${d.hours}` : '진료시간 미등록'}
                    {d.station ? ` · ${d.station}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={h.isActiveForMatching ? 'care' : 'outline'}>
                  {h.isActiveForMatching ? '매칭 활성' : '매칭 비활성'}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">의료진 ({doctors.length})</h3>
                  {doctors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">등록된 의료진 정보가 없습니다.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {doctors.map((doc, i) => (
                        <li key={i} className="flex items-baseline gap-2 text-sm">
                          <span className="font-medium">{doc.name}</span>
                          {doc.role ? (
                            <span className="text-xs text-muted-foreground">{doc.role}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">시설 · 룸 ({facilities.length})</h3>
                  {facilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">등록된 시설 정보가 없습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {facilities.map((f, i) => (
                        <Badge key={i} variant="outline">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {d.foreignSupport?.languages?.length ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      외국어 응대: {d.foreignSupport.languages.join(' · ')}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
