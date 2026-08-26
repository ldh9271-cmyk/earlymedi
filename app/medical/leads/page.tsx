import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { billingAccounts } from '@/drizzle/schema/billing';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { messages } from '@/drizzle/schema/messages';
import { leadTopups, leadUnlocks } from '@/drizzle/schema/lead-market';
import {
  LEAD_CATEGORY_LABEL_KO,
  LEAD_PRICE_BY_CATEGORY_WON,
  LEAD_PRICE_DEFAULT_WON,
  leadPriceWon,
  maskBodyPreview,
  maskContact,
  maskName,
} from '@/lib/leads/pricing';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';
import { TopupForm, UnlockButton } from './_components/leads-client';

export const metadata = { title: '리드 마켓' };
export const dynamic = 'force-dynamic';

/**
 * 리드 마켓 — glowuptour.com 상품 문의로 들어온 환자 DB 를 병원이
 * 건당(관심 분야별 3~6만원) 열람한다. 연락처·이름은 열람 전 마스킹.
 * 충전은 10만원 단위 신청 → 마스터 입금 확인 → 잔액 반영.
 */

async function resolveIntakeOrgId(): Promise<string | null> {
  const envOverride = process.env.INTAKE_AGENCY_ORG_ID;
  if (envOverride) return envOverride;
  const [first] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.accountType, 'agency'))
    .orderBy(sql`${organizations.createdAt} asc`)
    .limit(1);
  return first?.id ?? null;
}

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

const TOPUP_STATUS_LABEL: Record<string, string> = {
  pending: '입금 확인 대기',
  confirmed: '충전 완료',
  rejected: '반려',
};

export default async function MedicalLeadsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });

  const [[account], topups, unlockRows, intakeOrgId] = await Promise.all([
    db
      .select({ balance: billingAccounts.prepaidBalanceKrw })
      .from(billingAccounts)
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1),
    db
      .select()
      .from(leadTopups)
      .where(eq(leadTopups.organizationId, ctx.orgId))
      .orderBy(desc(leadTopups.createdAt))
      .limit(10),
    db
      .select({ conversationId: leadUnlocks.conversationId, priceWon: leadUnlocks.priceWon })
      .from(leadUnlocks)
      .where(eq(leadUnlocks.organizationId, ctx.orgId)),
    resolveIntakeOrgId(),
  ]);

  const balance = account?.balance ?? 0;
  const unlockedIds = new Set(unlockRows.map((u) => u.conversationId));
  const spentWon = unlockRows.reduce((s, u) => s + u.priceWon, 0);

  // 판매 대상 리드: 환자 포털(web) 문의 대화
  const leadRows = intakeOrgId
    ? await db
        .select({
          id: conversations.id,
          name: conversations.contactDisplayName,
          contactExternalId: conversations.contactExternalId,
          countryCode: conversations.contactCountryCode,
          locale: conversations.contactLocale,
          createdAt: conversations.createdAt,
          lastInboundAt: conversations.lastInboundAt,
        })
        .from(conversations)
        .innerJoin(channels, eq(conversations.channelId, channels.id))
        .where(and(eq(conversations.organizationId, intakeOrgId), eq(channels.kind, 'web')))
        .orderBy(desc(conversations.lastInboundAt))
        .limit(100)
    : [];

  const leadIds = leadRows.map((l) => l.id);
  const firstMessages = leadIds.length
    ? await db
        .select({
          conversationId: messages.conversationId,
          body: messages.body,
          metadata: messages.metadata,
          sentAt: messages.sentAt,
        })
        .from(messages)
        .where(and(inArray(messages.conversationId, leadIds), eq(messages.direction, 'inbound')))
        .orderBy(asc(messages.sentAt))
    : [];
  const firstByConv = new Map<string, (typeof firstMessages)[number]>();
  for (const m of firstMessages) {
    if (!firstByConv.has(m.conversationId)) firstByConv.set(m.conversationId, m);
  }

  const leads = leadRows.map((l) => {
    const first = firstByConv.get(l.id);
    const meta = (first?.metadata ?? {}) as {
      interests?: string[];
      hospitalName?: string;
      contact?: string;
      birthDate?: string;
    };
    const interests = meta.interests ?? [];
    const { priceWon } = leadPriceWon(interests);
    return {
      id: l.id,
      name: l.name ?? '',
      contact: meta.contact ?? l.contactExternalId ?? '',
      countryCode: l.countryCode ?? '—',
      locale: l.locale ?? '',
      createdAt: l.lastInboundAt ?? l.createdAt,
      interests,
      hospitalName: meta.hospitalName ?? null,
      birthDate: meta.birthDate ?? null,
      body: first?.body ?? '',
      priceWon,
      unlocked: unlockedIds.has(l.id),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">🎯 리드 마켓</Badge>
        <h1 className="text-2xl font-bold tracking-tight">리드 마켓 — 환자 문의 DB</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          glowuptour.com 상품 문의로 들어온 환자 리드입니다. 관심 분야별{' '}
          <strong className="text-foreground">건당 ₩30,000~60,000</strong> 에 연락처를 열람할 수
          있고, 한 번 연 리드는 무료로 다시 볼 수 있습니다.
        </p>
      </div>

      {/* 지갑 + 충전 */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <div className="text-2xl font-bold">{won(balance)}</div>
              <div className="text-[11px] text-muted-foreground">충전 잔액</div>
            </div>
            <div>
              <div className="text-lg font-bold">{unlockRows.length}건 · {won(spentWon)}</div>
              <div className="text-[11px] text-muted-foreground">누적 열람</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <TopupForm />
            <p className="text-[10px] text-muted-foreground">
              10만원 단위 충전 · 신청 후 안내 계좌로 입금하면 확인 즉시 잔액에 반영됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {topups.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">충전 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {topups.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <span className="font-semibold">{won(t.amountWon)}</span>
                <span
                  className={
                    t.status === 'confirmed'
                      ? 'text-care-700'
                      : t.status === 'rejected'
                        ? 'text-destructive'
                        : 'text-amber-600'
                  }
                >
                  {TOPUP_STATUS_LABEL[t.status] ?? t.status}
                </span>
                <span className="text-muted-foreground">
                  {formatLocal(new Date(t.createdAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* 가격표 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">열람 가격표</CardTitle>
          <CardDescription className="text-xs">관심 분야(상품 카테고리) 기준 · 리드 1건당</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(LEAD_PRICE_BY_CATEGORY_WON).map(([k, v]) => (
            <span key={k} className="rounded-full border px-3 py-1 text-[11px]">
              {LEAD_CATEGORY_LABEL_KO[k] ?? k} <strong>{won(v)}</strong>
            </span>
          ))}
          <span className="rounded-full border px-3 py-1 text-[11px]">
            기타 <strong>{won(LEAD_PRICE_DEFAULT_WON)}</strong>
          </span>
        </CardContent>
      </Card>

      {/* 리드 목록 */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold">문의 리드 {leads.length}건</h2>
        {leads.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              아직 판매 가능한 리드가 없습니다 — 환자 문의가 들어오면 여기에 표시됩니다.
            </CardContent>
          </Card>
        ) : (
          leads.map((l) => (
            <Card key={l.id} className={l.unlocked ? 'border-care-300' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">
                        {l.unlocked ? l.name || '(이름 미상)' : maskName(l.name)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {l.countryCode} · {l.locale || '—'}
                      </span>
                      {l.interests.map((k) => (
                        <Badge key={k} variant="outline" className="text-[10px]">
                          {LEAD_CATEGORY_LABEL_KO[k] ?? k}
                        </Badge>
                      ))}
                      {l.hospitalName ? (
                        <Badge variant="hospitality" className="text-[10px]">
                          관심 병원: {l.hospitalName}
                        </Badge>
                      ) : null}
                      {l.unlocked ? (
                        <Badge variant="care" className="text-[10px]">열람됨</Badge>
                      ) : null}
                    </div>

                    <div className="mt-1.5 text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">연락처 </span>
                      <span className={l.unlocked ? 'font-semibold' : 'text-muted-foreground'}>
                        {l.unlocked ? l.contact || '—' : maskContact(l.contact)}
                      </span>
                      {l.unlocked && l.birthDate ? (
                        <span className="ml-3 text-muted-foreground">생년월일 {l.birthDate}</span>
                      ) : null}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      {l.unlocked ? l.body : maskBodyPreview(l.body)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatLocal(new Date(l.createdAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                    </span>
                    {l.unlocked ? (
                      <span className="text-xs font-semibold text-care-700">열람 완료</span>
                    ) : (
                      <UnlockButton conversationId={l.id} priceWon={l.priceWon} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
