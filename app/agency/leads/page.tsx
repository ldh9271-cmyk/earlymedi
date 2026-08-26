import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { cases } from '@/drizzle/schema/cases';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '리드 파이프라인' };
export const dynamic = 'force-dynamic';

/**
 * 리드 파이프라인 — 모든 채널(웹 문의·AI 상담·카카오·LINE·WeChat …)로
 * 들어온 고객 문의를 스테이지별로 본다. 뷰티 투어·의료 모두 같은
 * 인입이므로 '환자'가 아니라 '고객' 기준. 상담 자체는 통합 인박스에서,
 * 여기서는 전환 현황(고객 등록·케이스 연결)을 추적한다.
 */

const STAGE_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  lead: { label: '신규 리드', variant: 'outline' },
  qualified: { label: 'Qualified', variant: 'brand' },
  case: { label: '케이스 연결', variant: 'hospitality' },
  quoted: { label: '견적 진행', variant: 'hospitality' },
  booked: { label: '예약 확정', variant: 'care' },
  archived: { label: '보관', variant: 'outline' },
};

const CHANNEL_LABEL: Record<string, string> = {
  web: '웹 문의',
  kakao: 'KakaoTalk',
  line: 'LINE',
  wechat: 'WeChat',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  messenger: 'Messenger',
  naver_talk: 'Naver 톡톡',
  sms: 'SMS',
  email: 'Email',
};

const STAGES = ['lead', 'qualified', 'case', 'quoted', 'booked'] as const;

export default async function AgencyLeadsPage({
  searchParams,
}: {
  searchParams: { stage?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const stageFilter = STAGES.includes(searchParams.stage as (typeof STAGES)[number])
    ? (searchParams.stage as (typeof STAGES)[number])
    : null;

  const { rows, counts, caseByConversation } = await withRls(ctx, async () => {
    const rows = await db
      .select({
        id: conversations.id,
        name: conversations.contactDisplayName,
        countryCode: conversations.contactCountryCode,
        locale: conversations.contactLocale,
        stage: conversations.stage,
        unreadCount: conversations.unreadCount,
        patientId: conversations.patientId,
        lastInboundAt: conversations.lastInboundAt,
        createdAt: conversations.createdAt,
        channelKind: channels.kind,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.organizationId, ctx.orgId),
          stageFilter
            ? eq(conversations.stage, stageFilter)
            : inArray(conversations.stage, [...STAGES]),
        ),
      )
      .orderBy(desc(conversations.lastInboundAt))
      .limit(200);

    const all = await db
      .select({ stage: conversations.stage })
      .from(conversations)
      .where(eq(conversations.organizationId, ctx.orgId));
    const counts: Record<string, number> = {};
    for (const r of all) counts[r.stage] = (counts[r.stage] ?? 0) + 1;

    const linked = await db
      .select({ id: cases.id, sourceConversationId: cases.sourceConversationId })
      .from(cases)
      .where(eq(cases.organizationId, ctx.orgId));
    const caseByConversation = new Map<string, string>();
    for (const c of linked) {
      if (c.sourceConversationId) caseByConversation.set(c.sourceConversationId, c.id);
    }

    return { rows, counts, caseByConversation };
  });

  const total = STAGES.reduce((s, k) => s + (counts[k] ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">🎯 리드</Badge>
        <h1 className="text-2xl font-bold tracking-tight">리드 파이프라인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          웹 문의 · AI 상담 · 메신저로 들어온 모든 고객 문의(뷰티 투어 · 의료)를 스테이지별로
          추적합니다. 상담과 스테이지 변경은{' '}
          <Link href="/agency/inbox" className="font-medium underline">통합 인박스</Link>에서,
          고객 등록은 인박스의 [+ 환자 CRM에 등록], 케이스 연결은{' '}
          <Link href="/agency/cases/new" className="font-medium underline">새 케이스</Link>로.
        </p>
      </div>

      {/* Stage filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/agency/leads"
          className={`rounded-full border px-3 py-1 text-xs ${!stageFilter ? 'border-brand-500 bg-brand-500 text-white' : 'hover:bg-muted/50'}`}
        >
          전체 {total}
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s}
            href={`/agency/leads?stage=${s}`}
            className={`rounded-full border px-3 py-1 text-xs ${stageFilter === s ? 'border-brand-500 bg-brand-500 text-white' : 'hover:bg-muted/50'}`}
          >
            {STAGE_META[s]?.label} {counts[s] ?? 0}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            해당 스테이지의 리드가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">고객</th>
                  <th className="px-2 py-2.5 text-left font-medium">채널</th>
                  <th className="px-2 py-2.5 text-left font-medium">스테이지</th>
                  <th className="px-2 py-2.5 text-left font-medium">전환</th>
                  <th className="px-2 py-2.5 text-left font-medium">마지막 문의</th>
                  <th className="px-4 py-2.5 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = STAGE_META[r.stage] ?? STAGE_META.lead!;
                  const caseId = caseByConversation.get(r.id);
                  return (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold">
                          {r.name ?? '(이름 미상)'}
                          {r.unreadCount > 0 ? (
                            <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {r.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.countryCode ?? '—'} · {r.locale ?? '—'}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">{CHANNEL_LABEL[r.channelKind] ?? r.channelKind}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {r.patientId ? (
                            <Link href={`/agency/patients/${r.patientId}`} className="text-care-700 hover:underline">
                              ✓ 고객 등록됨
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">미등록</span>
                          )}
                          {caseId ? (
                            <Link href={`/agency/cases/${caseId}`} className="text-brand-600 hover:underline">
                              ✓ 케이스
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {r.lastInboundAt
                          ? formatLocal(new Date(r.lastInboundAt), 'Asia/Seoul', 'MM-dd HH:mm')
                          : formatLocal(new Date(r.createdAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/agency/inbox?c=${r.id}`}
                          className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted/50"
                        >
                          인박스 열기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
