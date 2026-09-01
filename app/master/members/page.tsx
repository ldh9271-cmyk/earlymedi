import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { users } from '@/drizzle/schema/users';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: '회원 리스트 — 마스터 관리자' };

/**
 * 사이트 전체 회원 리스트 — 마스터 전용. 두 트랙으로 나눈다:
 *
 *   일반 회원  auth.users 중 signup_source='patient_portal' —
 *              공개 포털(/kr 등)에서 자가 가입한 B2C 고객.
 *   BIZ 회원   그 외 가입자 — 파트너 센터(/login·/signup) 경유.
 *              public.users 미러 + org_memberships 로 소속 조직·유형·
 *              역할을 붙인다. 조직 미개설(가입만) 상태도 표시.
 *
 * auth.users 는 anon 클라이언트로 못 읽으므로 service-role admin API
 * 로 가져온다 (/kr/admin 환자 가입 리스트와 같은 방식, 500명 캡 —
 * 초과 시 커서 페이지네이션 추가 필요).
 */

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: {
    username?: string;
    full_name?: string;
    country_code?: string;
    phone?: string;
    messenger_kind?: string;
    messenger_id?: string;
    signup_source?: string;
    signup_locale?: string;
  };
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_KO: Record<string, string> = {
  owner: '소유자', admin: '관리자', member: '멤버', viewer: '열람',
};

export default async function MasterMembersPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const tab = searchParams.tab === 'biz' ? 'biz' : 'general';

  // ── auth.users 전체 (service role) ──────────────────────────────
  let authUsers: AuthUser[] = [];
  let loadError: string | null = null;
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await (svc as unknown as {
      auth: {
        admin: {
          listUsers: (opts: { perPage: number }) => Promise<{
            data?: { users?: unknown[] };
            error?: { message: string } | null;
          }>;
        };
      };
    }).auth.admin.listUsers({ perPage: 500 });
    if (error) loadError = error.message;
    else authUsers = (data?.users ?? []) as AuthUser[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'unknown';
  }

  // ── 분류 규칙 ───────────────────────────────────────────────────
  // BIZ = 조직 멤버십 보유 또는 파트너 센터 가입 마커(partner_center).
  // 나머지는 전부 일반 회원 — 마커가 없는 계정(구글 OAuth 등 메타데이터
  // 미기록 가입)은 조직이 없는 한 일반으로 본다 (founder 2026-09-01).
  const memberIdSet = new Set<string>();
  try {
    if (authUsers.length > 0) {
      const rows = await db
        .select({ userId: orgMemberships.userId })
        .from(orgMemberships)
        .where(inArray(orgMemberships.userId, authUsers.map((u) => u.id)));
      for (const r of rows) memberIdSet.add(r.userId);
    }
  } catch {
    /* 멤버십 조회 실패 시 마커만으로 분류 */
  }
  const isBiz = (u: AuthUser): boolean =>
    memberIdSet.has(u.id) || u.user_metadata?.signup_source === 'partner_center';

  const general = authUsers
    .filter((u) => !isBiz(u))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const bizAuth = authUsers
    .filter(isBiz)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  // ── BIZ 가입자에 소속 조직·역할 붙이기 ──────────────────────────
  const bizOrgMap = new Map<string, Array<{ orgName: string; accountType: string; role: string; status: string }>>();
  const bizNameMap = new Map<string, string | null>();
  if (bizAuth.length > 0) {
    try {
      const ids = bizAuth.map((u) => u.id);
      const mirrorRows = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, ids));
      for (const r of mirrorRows) bizNameMap.set(r.id, r.fullName);

      const memberRows = await db
        .select({
          userId: orgMemberships.userId,
          role: orgMemberships.role,
          status: orgMemberships.status,
          orgName: organizations.name,
          accountType: organizations.accountType,
        })
        .from(orgMemberships)
        .innerJoin(organizations, eq(organizations.id, orgMemberships.organizationId))
        .where(inArray(orgMemberships.userId, ids));
      for (const m of memberRows) {
        const list = bizOrgMap.get(m.userId) ?? [];
        list.push({ orgName: m.orgName, accountType: m.accountType, role: m.role, status: m.status });
        bizOrgMap.set(m.userId, list);
      }
    } catch {
      /* 조직 매핑 실패는 리스트 표시를 막지 않는다 */
    }
  }

  const since30 = Date.now() - 30 * 86_400_000;
  const new30General = general.filter((u) => Date.parse(u.created_at) > since30).length;
  const new30Biz = bizAuth.filter((u) => Date.parse(u.created_at) > since30).length;

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>회원 리스트</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            사이트에 가입한 전체 계정입니다. 일반 회원(공개 포털 자가 가입)과 BIZ 회원(파트너 센터
            가입)으로 나눠 표시합니다.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline' }}>
          마스터 홈
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <StatCard label="일반 회원" value={`${general.length.toLocaleString('ko-KR')}명`} />
        <StatCard label="BIZ 회원" value={`${bizAuth.length.toLocaleString('ko-KR')}명`} accent="#c2143c" />
        <StatCard label="최근 30일 신규 (일반)" value={`${new30General}명`} accent="#047857" />
        <StatCard label="최근 30일 신규 (BIZ)" value={`${new30Biz}명`} accent="#047857" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {[
          { key: 'general', label: `일반 회원 (${general.length})`, href: '/master/members' },
          { key: 'biz', label: `BIZ 회원 (${bizAuth.length})`, href: '/master/members?tab=biz' },
        ].map((c) => (
          <Link
            key={c.key}
            href={c.href}
            style={{
              border: '1px solid #dddddd', borderRadius: 9999,
              padding: '6px 14px', fontSize: 13, textDecoration: 'none',
              background: tab === c.key ? '#222' : '#fff',
              color: tab === c.key ? '#fff' : '#222',
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {loadError ? (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>
          회원 목록을 불러오지 못했습니다: {loadError}
        </p>
      ) : null}

      <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {tab === 'general' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                  <Th>가입일</Th>
                  <Th>이메일</Th>
                  <Th>이름 · 닉네임</Th>
                  <Th>국가</Th>
                  <Th>메신저</Th>
                  <Th>가입 로케일</Th>
                </tr>
              </thead>
              <tbody>
                {general.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#6a6a6a' }}>
                      아직 일반 회원 가입이 없습니다.
                    </td>
                  </tr>
                ) : (
                  general.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid #ebebeb' }}>
                      <Td>{fmtDate(u.created_at)}</Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>{u.email ?? '—'}</span>
                        <Pill
                          text={u.email_confirmed_at ? '인증됨' : '미인증'}
                          bg={u.email_confirmed_at ? '#ecfdf5' : '#fff7ed'}
                          fg={u.email_confirmed_at ? '#047857' : '#b45309'}
                        />
                      </Td>
                      <Td>
                        {u.user_metadata?.full_name ?? u.user_metadata?.username ?? '—'}
                      </Td>
                      <Td>{u.user_metadata?.country_code ?? '—'}</Td>
                      <Td>
                        {u.user_metadata?.messenger_kind
                          ? `${u.user_metadata.messenger_kind} ${u.user_metadata.messenger_id ?? ''}`
                          : '—'}
                      </Td>
                      <Td>{u.user_metadata?.signup_locale ?? '—'}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
              <thead>
                <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                  <Th>가입일</Th>
                  <Th>이메일</Th>
                  <Th>이름</Th>
                  <Th>소속 조직 · 역할</Th>
                  <Th>마지막 로그인</Th>
                </tr>
              </thead>
              <tbody>
                {bizAuth.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#6a6a6a' }}>
                      아직 BIZ 회원 가입이 없습니다.
                    </td>
                  </tr>
                ) : (
                  bizAuth.map((u) => {
                    const orgs = bizOrgMap.get(u.id) ?? [];
                    return (
                      <tr key={u.id} style={{ borderTop: '1px solid #ebebeb' }}>
                        <Td>{fmtDate(u.created_at)}</Td>
                        <Td>
                          <span style={{ fontWeight: 600 }}>{u.email ?? '—'}</span>
                          {!u.email_confirmed_at ? (
                            <Pill text="미인증" bg="#fff7ed" fg="#b45309" />
                          ) : null}
                        </Td>
                        <Td>{bizNameMap.get(u.id) ?? u.user_metadata?.full_name ?? '—'}</Td>
                        <Td>
                          {orgs.length === 0 ? (
                            <Pill text="조직 미개설" bg="#f5f5f5" fg="#6a6a6a" />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {orgs.map((o, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600 }}>{o.orgName}</span>
                                  <Pill
                                    text={ACCOUNT_TYPE_LABEL_KO[o.accountType as keyof typeof ACCOUNT_TYPE_LABEL_KO] ?? o.accountType}
                                    bg="#fff5f7"
                                    fg="#c2143c"
                                  />
                                  <span style={{ fontSize: 11, color: '#6a6a6a' }}>
                                    {ROLE_KO[o.role] ?? o.role}
                                    {o.status !== 'active' ? ` · ${o.status}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </Td>
                        <Td>{fmtDate(u.last_sign_in_at)}</Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 12 }}>
        * BIZ 회원 = 조직 멤버십 보유 또는 파트너 센터 가입 계정. 그 외(공개 포털 가입, 가입
        출처 미기록 포함)는 모두 일반 회원으로 분류합니다. &quot;조직 미개설&quot; = 파트너 센터로
        가입했지만 아직 조직을 만들지 않은 상태. 500명 초과 시 페이지네이션이 필요합니다.
      </p>
    </div>
  );
}

function Pill({ text, bg, fg }: { text: string; bg: string; fg: string }): JSX.Element {
  return (
    <span
      style={{
        background: bg, color: fg, borderRadius: 9999, padding: '2px 8px',
        fontSize: 11, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: '#6a6a6a', textAlign: 'left' }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }): JSX.Element {
  return <td style={{ padding: '12px', verticalAlign: 'top' }}>{children}</td>;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }): JSX.Element {
  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 18px', minWidth: 180 }}>
      <div style={{ fontSize: 12, color: '#6a6a6a' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: accent ?? '#222' }}>{value}</div>
    </div>
  );
}
