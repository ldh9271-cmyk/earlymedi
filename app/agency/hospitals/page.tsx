import Link from 'next/link';
import { Plus, MapPin, Stethoscope, CheckCircle2, XCircle } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listHospitals } from '@/lib/db/repositories/hospitals';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '병원 마켓플레이스' };

export default async function HospitalsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const data = await withRls(ctx, () => listHospitals(ctx.orgId, {}, 60));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">병원 마켓플레이스</h1>
          <p className="text-sm text-muted-foreground">
            협력 병원 디렉토리 · 의사 프로필 · 송객 수수료/예약금 정책 관리.
            <strong className="text-foreground"> 정책 미설정 병원은 매칭에서 자동 제외됩니다.</strong>
          </p>
        </div>
        <Link href="/agency/hospitals/onboard">
          <Button variant="brand">
            <Plus className="mr-1 h-4 w-4" /> 신규 병원 등록
          </Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="등록된 협력 병원이 없습니다"
          description="첫 협력 병원을 등록하고 송객 수수료 + 예약금 정책을 설정하면 환자 매칭이 활성화됩니다."
          action={
            <Link href="/agency/hospitals/onboard">
              <Button variant="brand">신규 병원 등록 위저드</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((h) => (
            <Link key={h.id} href={`/agency/hospitals/${h.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-base font-semibold">{h.name}</div>
                    {h.isActiveForMatching ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-care-50 px-2 py-0.5 text-[10px] font-semibold text-care-700">
                        <CheckCircle2 className="h-3 w-3" /> 활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <XCircle className="h-3 w-3" /> 미완료
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {h.countryCode} · {(h.addressJson.city ?? '—')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {h.primaryCategories.slice(0, 4).map((c) => (
                      <Badge key={c} variant="brand">
                        {c.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    의사 {h.doctorCount}명 · 평점 {h.rating ? (h.rating / 10).toFixed(1) : '—'} ·
                    리뷰 {h.reviewsCount}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
