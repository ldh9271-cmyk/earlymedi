import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listPatients } from '@/lib/db/repositories/patients';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '환자 CRM' };

export default async function PatientsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const data = await withRls(ctx, () => listPatients(ctx.orgId, {}, 80));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">환자 CRM</h1>
          <p className="text-sm text-muted-foreground">
            모든 환자 레코드는 Agency 소유 · 외부 카테고리 노출은 affiliation/contract 권한 통과 시에만.
          </p>
        </div>
        <Link href="/agency/patients/new">
          <Button variant="brand">
            <Plus className="mr-1 h-4 w-4" /> 신규 환자
          </Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="아직 환자 레코드가 없습니다"
          description="신규 환자 등록 → 여권 OCR로 자동 입력하거나, 인박스 대화에서 [환자 CRM에 등록] 버튼으로 추가하세요."
          action={
            <Link href="/agency/patients/new">
              <Button variant="brand">여권으로 신규 환자 등록</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} href={`/agency/patients/${p.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-base font-semibold">{p.fullName}</div>
                    <Badge variant={p.status === 'active' ? 'care' : 'slate'}>{p.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.nationality ?? '국적 미상'} · {p.sex} · {p.dateOfBirth ?? '생년월일 미상'}
                  </div>
                  {p.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="text-[10px] text-muted-foreground">
                    수정 {formatLocal(p.updatedAt, 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}
                    {p.sourceChannel ? ` · ${p.sourceChannel}` : ''}
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
