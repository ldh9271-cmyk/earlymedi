import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, AlertTriangle, GitMerge, Trash2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import type { AccountType } from '@/lib/auth/account-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  getOrgDependencyCounts,
  listMergeCandidates,
  deleteOrgAsMaster,
  mergeOrgAsMaster,
} from '../../_actions/org-admin';

export const metadata = { title: '조직 관리 · 마스터' };
export const dynamic = 'force-dynamic';

export default async function MasterOrgManagePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { confirm?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/master/orgs/${params.id}`);
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      legalName: organizations.legalName,
      accountType: organizations.accountType,
      countryCode: organizations.countryCode,
      verificationStatus: organizations.verificationStatus,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.id, params.id))
    .limit(1);
  if (!org) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 text-center text-sm text-muted-foreground">
        조직을 찾을 수 없습니다.
        <div className="mt-4">
          <Link href="/master" className="text-foreground underline">
            ← 마스터 콘솔로
          </Link>
        </div>
      </div>
    );
  }

  const dep = await getOrgDependencyCounts(org.id);
  const candidates = await listMergeCandidates(org.id);
  const isDeleteConfirm = searchParams.confirm === 'delete';
  const isMergeConfirm = searchParams.confirm === 'merge';

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
          마스터 전용 · 조직 관리
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ACCOUNT_TYPE_LABEL_KO[org.accountType as AccountType]} ·{' '}
          {org.legalName ?? '법인명 미등록'} · {org.countryCode}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{org.id}</p>
      </header>

      {/* Dependency counts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">의존 데이터</CardTitle>
          <CardDescription>
            이 조직에 속한 모든 데이터입니다. 삭제 시 cascade로 함께 사라집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dep.ok && dep.counts ? (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              <DepCell label="멤버" value={dep.counts.members} />
              <DepCell label="병원" value={dep.counts.hospitals} />
              <DepCell label="환자" value={dep.counts.patients} />
              <DepCell label="대화" value={dep.counts.conversations} />
              <DepCell label="채널" value={dep.counts.channels} />
            </div>
          ) : (
            <p className="text-xs text-destructive">{dep.error ?? '조회 실패'}</p>
          )}
        </CardContent>
      </Card>

      {/* Merge */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            <CardTitle className="text-base">다른 조직으로 합치기</CardTitle>
          </div>
          <CardDescription>
            이 조직의 모든 데이터(멤버·병원·환자·대화·채널)를 대상 조직으로 옮긴 후
            <strong className="text-foreground"> 이 조직은 삭제</strong>됩니다. 같은
            액터 타입({ACCOUNT_TYPE_LABEL_KO[org.accountType as AccountType]})끼리만
            합칠 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              합칠 수 있는 다른{' '}
              {ACCOUNT_TYPE_LABEL_KO[org.accountType as AccountType]} 조직이 없습니다.
            </p>
          ) : !isMergeConfirm ? (
            <Link href={`/master/orgs/${org.id}?confirm=merge`}>
              <Button variant="outline">합치기 시작 →</Button>
            </Link>
          ) : (
            <form action={mergeOrgAsMaster} className="space-y-3">
              <input type="hidden" name="sourceOrgId" value={org.id} />
              <div className="space-y-1.5">
                <label htmlFor="targetOrgId" className="text-xs font-medium">
                  대상 조직 (이 조직으로 합쳐집니다)
                </label>
                <select
                  id="targetOrgId"
                  name="targetOrgId"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue=""
                >
                  <option value="" disabled>
                    대상 선택…
                  </option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  💡 멤버 수가 많은 조직을 대상으로 선택하는 게 안전합니다.
                </p>
              </div>
              <div className="rounded-md border border-hospitality-300 bg-hospitality-50 p-3 text-xs text-hospitality-900">
                <p className="font-semibold">⚠ 되돌릴 수 없습니다</p>
                <p className="mt-0.5">
                  멤버 {dep.counts?.members ?? '?'}명 · 병원 {dep.counts?.hospitals ?? '?'}개 ·
                  환자 {dep.counts?.patients ?? '?'}명이 대상 조직으로 이동하고,
                  &quot;{org.name}&quot;는 영구 삭제됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="hospitality">
                  합치기 실행
                </Button>
                <Link href={`/master/orgs/${org.id}`}>
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Delete */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base text-destructive">조직 영구 삭제</CardTitle>
          </div>
          <CardDescription>
            이 조직과 모든 의존 데이터(멤버·병원·환자·대화·채널·시술 차트·결제·정산 등)가
            <strong className="text-destructive"> 영구적으로 삭제</strong>됩니다.
            데이터가 없는 빈 조직 정리 용도로만 사용하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isDeleteConfirm ? (
            <Link href={`/master/orgs/${org.id}?confirm=delete`}>
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                삭제 시작 →
              </Button>
            </Link>
          ) : (
            <form action={deleteOrgAsMaster} className="space-y-3">
              <input type="hidden" name="orgId" value={org.id} />
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="space-y-1 text-destructive">
                    <p className="font-semibold">정말 삭제하시겠습니까?</p>
                    <p>
                      다음 데이터가 영구 삭제됩니다:
                      <span className="ml-1 font-mono">
                        멤버 {dep.counts?.members ?? '?'} · 병원 {dep.counts?.hospitals ?? '?'} ·
                        환자 {dep.counts?.patients ?? '?'} · 대화 {dep.counts?.conversations ?? '?'} ·
                        채널 {dep.counts?.channels ?? '?'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="destructive">
                  영구 삭제 실행
                </Button>
                <Link href={`/master/orgs/${org.id}`}>
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DepCell({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${value === 0 ? 'text-muted-foreground' : ''}`}>
        {value}
      </div>
    </div>
  );
}
