import { ShieldAlert } from 'lucide-react';
import { asc, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerFacilities } from '@/drizzle/schema/partner-facilities';
import { partnerServices } from '@/drizzle/schema/partner-services';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { setPostOpConstraintsAction } from './_actions';

export const metadata = { title: '시술 후 제약' };
export const dynamic = 'force-dynamic';

/** 에이전시 시술 카탈로그 constraints_json(avoid*) 과 짝을 맞춘 어휘. */
const CONSTRAINT_LABEL: Record<string, string> = {
  sauna: '사우나 · 찜질 · 온탕',
  uv: '자외선 · 장시간 야외',
  alcohol: '음주 동반',
  intense_exercise: '고강도 운동',
};

function parseAvoid(attributes: Record<string, string | number | boolean> | null): string[] {
  const raw = attributes?.postOpAvoid;
  return typeof raw === 'string' && raw ? raw.split(',') : [];
}

/**
 * 시술 후 제약 — 우리 시설·서비스 중 시술 직후 게스트에게 제공하면
 * 안 되는 항목을 태그한다. 시술 카탈로그의 회복 제약(사우나·자외선·
 * 음주·고강도 운동 회피 일수)과 같은 어휘라서, 에이전시가 회복 기간
 * 중인 게스트의 패키지를 짤 때 태그된 항목을 대조해 거를 수 있다.
 */
export default async function PartnerConstraintsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  const { facilities, services } = await withRls(ctx, async () => ({
    facilities: await db
      .select({
        id: partnerFacilities.id,
        name: partnerFacilities.name,
        kind: partnerFacilities.kind,
        isActive: partnerFacilities.isActive,
        attributes: partnerFacilities.attributes,
      })
      .from(partnerFacilities)
      .where(eq(partnerFacilities.organizationId, ctx.orgId))
      .orderBy(asc(partnerFacilities.name))
      .limit(200),
    services: await db
      .select({
        id: partnerServices.id,
        name: partnerServices.name,
        category: partnerServices.category,
        isActive: partnerServices.isActive,
        attributes: partnerServices.attributes,
      })
      .from(partnerServices)
      .where(eq(partnerServices.organizationId, ctx.orgId))
      .orderBy(asc(partnerServices.name))
      .limit(200),
  }));

  const items = [
    ...facilities.map((f) => ({ ...f, itemKind: 'facility' as const, sub: f.kind })),
    ...services.map((s) => ({ ...s, itemKind: 'service' as const, sub: s.category })),
  ];
  const tagged = items.filter((i) => parseAvoid(i.attributes).length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">시술 후 제약</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시술 직후 게스트에게 제공하면 안 되는 시설·서비스를 태그해 두세요. 에이전시가
          회복 기간 중인 게스트의 패키지를 구성할 때 시술별 제약(사우나·자외선·음주·고강도
          운동 회피 기간)과 대조하는 데 쓰입니다.
        </p>
      </div>

      {searchParams.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          처리에 실패했습니다: {searchParams.error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {[
          ['시설', facilities.length],
          ['서비스', services.length],
          ['제약 태그됨', tagged],
        ].map(([label, n]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={ShieldAlert}
              title="등록된 시설·서비스가 없습니다"
              description="먼저 시설 등록 또는 메뉴·가격표 화면에서 상품을 등록하면 여기서 시술 후 제약을 태그할 수 있습니다."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const avoid = parseAvoid(item.attributes);
            return (
              <Card key={`${item.itemKind}-${item.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {item.itemKind === 'facility' ? '시설' : '서비스'} · {item.sub}
                      {!item.isActive ? ' · 비활성' : ''}
                    </CardDescription>
                  </div>
                  {avoid.length > 0 ? (
                    <Badge variant="destructive">회복기 제한 {avoid.length}종</Badge>
                  ) : (
                    <Badge variant="outline">제약 없음</Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <form
                    action={setPostOpConstraintsAction}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2"
                  >
                    <input type="hidden" name="kind" value={item.itemKind} />
                    <input type="hidden" name="id" value={item.id} />
                    {Object.entries(CONSTRAINT_LABEL).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          name="avoid"
                          value={key}
                          defaultChecked={avoid.includes(key)}
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        {label}
                      </label>
                    ))}
                    <Button type="submit" variant="outline" size="sm" className="ml-auto">
                      저장
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
