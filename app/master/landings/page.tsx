import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, Globe2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { PROCEDURE_CATALOG, PUBLIC_CATEGORIES } from '@/lib/catalog';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { countByCategory } from './_actions';

export const metadata = { title: '카테고리 랜딩 관리 · 마스터' };
export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  dental: '치과',
  hair: '모발',
  health_checkup: '건강검진',
  beauty_tour: '뷰티 투어',
  makeup: '헤어·메이크업',
  photo_studio: '사진 스튜디오',
};

const CATEGORY_ACCENTS: Record<string, string> = {
  plastic_surgery: 'bg-brand-100 text-brand-700',
  dermatology: 'bg-hospitality-100 text-hospitality-700',
  dental: 'bg-care-100 text-care-700',
  hair: 'bg-rose-100 text-rose-700',
  health_checkup: 'bg-blue-100 text-blue-700',
  beauty_tour: 'bg-amber-100 text-amber-700',
  makeup: 'bg-pink-100 text-pink-700',
  photo_studio: 'bg-slate-100 text-slate-700',
};

export default async function MasterLandingsIndex(): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/landings');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const { counts, tableMissing } = await countByCategory();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
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
        <h1 className="text-2xl font-bold tracking-tight">카테고리 랜딩 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          환자 포털 (glowuptour.com) 의 카테고리·시술별 노출되는 병원·호텔을 직접
          매핑합니다. 추가된 병원은{' '}
          <code className="rounded bg-muted px-1 font-mono text-[11px]">/[locale]/procedures</code>
          {' '} 및 {' '}
          <code className="rounded bg-muted px-1 font-mono text-[11px]">/[locale]/clinics</code>
          {' '} 페이지에 즉시 반영됩니다.
        </p>
      </header>

      {tableMissing ? (
        <div className="mb-6 rounded-lg border border-hospitality-300 bg-hospitality-50 p-4 text-sm">
          <p className="font-semibold text-hospitality-900">⚠ 데이터베이스 마이그레이션 필요</p>
          <p className="mt-1 text-xs text-hospitality-900/80">
            <code className="rounded bg-white px-1 font-mono">category_listings</code> 테이블이 아직
            Supabase 에 생성되지 않았습니다. 마스터 콘솔은 표시되지만 매핑을 추가·조회할 수 없습니다.
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs text-hospitality-900/80">
            <li>Supabase Dashboard → 좌측 메뉴 <strong>SQL Editor</strong> 클릭</li>
            <li><strong>+ New query</strong> 클릭</li>
            <li>
              레포의 <code className="rounded bg-white px-1 font-mono">drizzle/sql/category-listings.sql</code>{' '}
              내용 전체 복사 → 붙여넣기
            </li>
            <li>우측 상단 <strong>Run</strong> 클릭</li>
            <li>이 페이지 새로고침 — 노란 배너가 사라지면 적용 완료</li>
          </ol>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PUBLIC_CATEGORIES.map((key) => {
          const procedures = PROCEDURE_CATALOG[key] ?? [];
          const count = counts.get(key) ?? 0;
          return (
            <Link key={key} href={`/master/landings/${key}`}>
              <Card className="group transition hover:border-brand-300 hover:shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        CATEGORY_ACCENTS[key] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Globe2 className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{CATEGORY_LABELS[key]}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {procedures.length}개 시술 · 매핑된 listing {count}개
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {procedures.slice(0, 4).map((p) => (
                      <Badge key={p.slug} variant="secondary" className="text-[10px]">
                        {p.name.kr}
                      </Badge>
                    ))}
                    {procedures.length > 4 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        +{procedures.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
