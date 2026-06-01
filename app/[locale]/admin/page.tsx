import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { desc, eq, and, sql } from 'drizzle-orm';
import { ShieldAlert, Users, MessageCircle, Globe2, Building2 } from 'lucide-react';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { channels } from '@/drizzle/schema/channels';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';

/**
 * Patient-portal admin page — master-only.
 *
 * What it shows:
 *   1. Self-signups → patients who used /[locale]/signup (email+password
 *      or Google). Source-of-truth is `auth.users.raw_user_meta_data`
 *      where `signup_source = 'patient_portal'`. Accessed via the
 *      service-role admin API since the anon client can't list users.
 *   2. 1:1 inquiries → conversations created by `/[locale]/inquiry`
 *      submissions. These live in the regular `conversations` table
 *      under the intake agency's "web" channel.
 *   3. Quick stats — last 30 days signups + open inquiries.
 *
 * Auth:
 *   - Must be signed in.
 *   - Email must be in MASTER_EMAILS env allowlist.
 *   - Otherwise we 404 silently (don't reveal the page exists).
 *
 * Why /[locale]/admin and not /master/patients:
 *   - The existing /master is org-scoped (impersonate any organization).
 *     Patient data crosses org boundaries — it belongs at the public
 *     portal level so the master operator sees it without picking an
 *     org first.
 *   - Locale prefix is mandatory for B2C layout consistency.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<{ title: string }> {
  if (!isPublicLocale(params.locale)) return { title: 'Admin' };
  return { title: `Patient Admin · KoreaGlowUp` };
}

type PatientSignup = {
  id: string;
  email: string | undefined;
  createdAt: string;
  emailConfirmed: boolean;
  meta: {
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

export default async function PatientAdminPage({
  params,
}: {
  params: { locale: string };
}): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  await getDictionary(locale); // ensures locale validated; copy below is master-only English+Korean

  // ─── Auth ─────────────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/${locale}/login?next=/${locale}/admin`);
  }
  const email = auth.user.email ?? '';
  if (!isMasterEmail(email)) {
    // Silent — never confirm the page exists for non-masters.
    notFound();
  }

  // ─── Load patient self-signups via service role ───────────────────
  // The anon client can't see auth.users; service-role admin API can.
  // Pagination cap: 500 should comfortably fit early-stage signups; once
  // we exceed that, add a cursor.
  let signups: PatientSignup[] = [];
  let signupError: string | null = null;
  try {
    const svc = createSupabaseServiceClient();
    // admin API is on `auth.admin` — typed through @supabase/ssr re-export.
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
    if (error) {
      signupError = error.message;
    } else {
      const users = (data?.users ?? []) as Array<{
        id: string;
        email?: string;
        created_at: string;
        email_confirmed_at?: string | null;
        user_metadata?: PatientSignup['meta'];
      }>;
      signups = users
        .filter((u) => u.user_metadata?.signup_source === 'patient_portal')
        .map((u) => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          emailConfirmed: !!u.email_confirmed_at,
          meta: u.user_metadata ?? {},
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
  } catch (e) {
    signupError = e instanceof Error ? e.message : 'unknown';
  }

  // ─── Load 1:1 inquiries (web channel conversations) ───────────────
  // Pull recent 100. Latest first.
  let inquiries: Array<{
    id: string;
    contactDisplayName: string | null;
    contactCountryCode: string | null;
    contactLocale: string | null;
    lastInboundAt: Date | null;
    snippet: string | null;
  }> = [];
  let inquiryError: string | null = null;
  try {
    const rows = await db
      .select({
        id: conversations.id,
        contactDisplayName: conversations.contactDisplayName,
        contactCountryCode: conversations.contactCountryCode,
        contactLocale: conversations.contactLocale,
        lastInboundAt: conversations.lastInboundAt,
        channelKind: channels.kind,
        snippet: sql<string | null>`(
          select substring(${messages.body}, 1, 120)
          from ${messages}
          where ${messages.conversationId} = ${conversations.id}
            and ${messages.direction} = 'inbound'
          order by ${messages.sentAt} desc
          limit 1
        )`,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(and(eq(channels.kind, 'web')))
      .orderBy(desc(conversations.lastInboundAt))
      .limit(100);
    inquiries = rows.map((r) => ({
      id: r.id,
      contactDisplayName: r.contactDisplayName,
      contactCountryCode: r.contactCountryCode,
      contactLocale: r.contactLocale,
      lastInboundAt: r.lastInboundAt,
      snippet: r.snippet,
    }));
  } catch (e) {
    inquiryError = e instanceof Error ? e.message : 'unknown';
  }

  // ─── 30-day stats ─────────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const signups30d = signups.filter((s) => new Date(s.createdAt) >= cutoff).length;
  const inquiries30d = inquiries.filter(
    (q) => q.lastInboundAt && q.lastInboundAt >= cutoff,
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Master banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">마스터 모드 · Master Mode</p>
          <p className="mt-0.5 text-xs text-destructive/80">
            환자 포털의 모든 자가 가입자 · 1:1 문의를 조회할 수 있습니다. 데이터 접근은
            audit log에 isMaster=true 로 기록됩니다.
          </p>
          <p className="mt-1 text-[11px] text-destructive/70">{email}</p>
        </div>
      </div>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">환자 포털 관리자</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          glowuptour.com · 환자 자가 가입과 1:1 문의 관리.
        </p>
      </header>

      {/* Stats */}
      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="총 가입자" value={signups.length} hint={`이메일 인증 ${signups.filter((s) => s.emailConfirmed).length}명`} />
        <StatCard icon={Users} label="30일 신규 가입" value={signups30d} hint="patient_portal" />
        <StatCard icon={MessageCircle} label="총 1:1 문의" value={inquiries.length} hint="web channel" />
        <StatCard icon={MessageCircle} label="30일 신규 문의" value={inquiries30d} hint="last 30d" />
      </div>

      {/* Cross-link to B2B master */}
      <div className="mb-8 rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium">B2B 사업자 관리는 별도 콘솔에 있습니다.</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          의료기관 · 유치업체 · 파트너업체 · 프리랜서 조직 진입은 /master 페이지에서 처리합니다.
        </p>
        <Link
          href="/master"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <Building2 className="h-3.5 w-3.5" />
          /master 콘솔로 →
        </Link>
      </div>

      {/* Patient self-signups */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">환자 자가 가입 ({signups.length})</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">최신순</span>
        </div>

        {signupError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            가입자 조회 실패: {signupError}
          </div>
        ) : signups.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
            아직 자가 가입한 환자가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">이름</th>
                  <th className="px-3 py-2 text-left font-semibold">아이디</th>
                  <th className="px-3 py-2 text-left font-semibold">이메일</th>
                  <th className="px-3 py-2 text-left font-semibold">국가</th>
                  <th className="px-3 py-2 text-left font-semibold">전화</th>
                  <th className="px-3 py-2 text-left font-semibold">메신저</th>
                  <th className="px-3 py-2 text-left font-semibold">언어</th>
                  <th className="px-3 py-2 text-left font-semibold">인증</th>
                  <th className="px-3 py-2 text-left font-semibold">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {signups.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{s.meta.full_name ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {s.meta.username ?? '—'}
                    </td>
                    <td className="px-3 py-2">{s.email ?? '—'}</td>
                    <td className="px-3 py-2">
                      {s.meta.country_code ? (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {s.meta.country_code}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{s.meta.phone ?? '—'}</td>
                    <td className="px-3 py-2">
                      {s.meta.messenger_kind ? (
                        <span className="inline-flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {s.meta.messenger_kind}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {s.meta.messenger_id ?? '—'}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {s.meta.signup_locale ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.meta.signup_locale}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {s.emailConfirmed ? (
                        <Badge variant="care" className="text-[10px]">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="hospitality" className="text-[10px]">
                          대기
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString('ko-KR', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 1:1 inquiries */}
      <section>
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">1:1 문의 ({inquiries.length})</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">최신순 · 최근 100건</span>
        </div>

        {inquiryError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            문의 조회 실패: {inquiryError}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
            아직 1:1 문의가 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {inquiries.map((q) => (
              <li
                key={q.id}
                className="rounded-md border bg-card px-3 py-2.5 text-xs hover:bg-muted/30"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{q.contactDisplayName ?? '익명 환자'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {q.lastInboundAt
                      ? new Date(q.lastInboundAt).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {q.contactCountryCode ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {q.contactCountryCode}
                    </Badge>
                  ) : null}
                  {q.contactLocale ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <Globe2 className="mr-0.5 inline h-2.5 w-2.5" />
                      {q.contactLocale}
                    </Badge>
                  ) : null}
                </div>
                {q.snippet ? (
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-foreground/80">{q.snippet}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
          {hint ? <div className="text-[10px] text-muted-foreground">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
