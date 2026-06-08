'use server';

import 'server-only';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { channels } from '@/drizzle/schema/channels';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { auditLogs } from '@/drizzle/schema/audit';
import { encryptPii } from '@/lib/encryption/pgcrypto';
import { ACTIVE_ORG_HEADER } from '@/lib/auth/active-org';
import { isMasterEmail } from '@/lib/auth/master';
import { CHANNELS, type ChannelKind } from './registry';

/**
 * Server actions for the /agency/channels page: connect a new messenger
 * account, disconnect / pause one, and list what's currently connected.
 *
 * Credentials live in `channels.credentialsEncrypted` (pgcrypto pgp_sym_*).
 * The plaintext leaves the request only as the form payload — never
 * persisted unencrypted and never returned to the client.
 */

const ConnectInputSchema = z.object({
  kind: z.enum([
    'kakao',
    'line',
    'telegram',
    'whatsapp',
    'instagram',
    'messenger',
    'naver',
    'wechat',
  ]),
  displayName: z.string().min(1).max(120),
  externalAccountId: z.string().min(1).max(200),
  credentials: z.record(z.string(), z.string()),
});

export type ConnectChannelInput = z.infer<typeof ConnectInputSchema>;

/**
 * Server-action auth guard — resolves the ACTIVE org (not the user's first
 * membership) and verifies the user has write-level role there.
 *
 * History: this used to ignore the active-org cookie and just grab the
 * user's first membership via LIMIT 1. That silently broke two scenarios:
 *
 *   1. Multi-tenant users (one human, multiple agencies they manage):
 *      every server action wrote into the WRONG agency.
 *
 *   2. Master mode: master accounts aren't in org_memberships at all, so
 *      the first-membership lookup returned EMPTY and threw 'no_membership'
 *      — or worse, returned the master's own org membership and then
 *      `channels WHERE org_id = <master_org>` came up dry as
 *      'channel_not_found' (the real production error this fix targets).
 *
 * The middleware sets the x-em-active-org header from the em.active_org
 * cookie on every request, so server actions reading the header always
 * see the org the user is currently looking at. Master accounts bypass
 * the membership join and get granted owner role on whatever org they
 * impersonated — same pattern as requireAccess() in route-guards.
 */
async function requireOrgOwnerOrAdmin(): Promise<{
  userId: string;
  orgId: string;
  isMaster: boolean;
}> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const activeOrgId = headers().get(ACTIVE_ORG_HEADER);
  if (!activeOrgId) throw new Error('no_active_org');

  const email = auth.user.email ?? '';
  if (isMasterEmail(email)) {
    // Master mode: skip the membership join. Verify the org exists so a
    // tampered cookie can't point us at a deleted/nonexistent org. Master
    // is treated as 'owner' for role-gated actions.
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, activeOrgId))
      .limit(1);
    if (!org) throw new Error('org_not_found');
    return { userId: auth.user.id, orgId: activeOrgId, isMaster: true };
  }

  const [m] = await db
    .select({ orgId: orgMemberships.organizationId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, auth.user.id),
        eq(orgMemberships.organizationId, activeOrgId),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(1);
  if (!m) throw new Error('no_membership');
  if (!['owner', 'admin', 'manager'].includes(m.role)) throw new Error('insufficient_role');
  return { userId: auth.user.id, orgId: m.orgId, isMaster: false };
}

export async function connectChannelAction(rawInput: ConnectChannelInput): Promise<{
  channelId: string;
  webhookUrl: string;
}> {
  const input = ConnectInputSchema.parse(rawInput);
  const def = CHANNELS[input.kind as ChannelKind];
  if (!def.ready) {
    throw new Error('channel_not_ready');
  }

  const { userId, orgId } = await requireOrgOwnerOrAdmin();

  // Validate that every required credential field has a non-empty value.
  for (const field of def.credentialFields) {
    // Treat any field whose Korean label contains "선택" as optional.
    if (field.label.includes('선택')) continue;
    const value = input.credentials[field.key];
    if (!value || value.trim() === '') {
      throw new Error(`missing_credential:${field.key}`);
    }
  }

  // Encrypt the whole credentials bag as a single JSON blob.
  const encrypted = await encryptPii(JSON.stringify(input.credentials));

  const [row] = await db
    .insert(channels)
    .values({
      organizationId: orgId,
      kind: input.kind,
      displayName: input.displayName,
      externalAccountId: input.externalAccountId,
      status: 'connected',
      credentialsEncrypted: encrypted,
      lastSyncAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [channels.organizationId, channels.kind, channels.externalAccountId],
      set: {
        displayName: input.displayName,
        status: 'connected',
        credentialsEncrypted: encrypted,
        lastSyncAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: channels.id });

  if (!row) throw new Error('channel_save_failed');

  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'create',
    entityType: 'channel',
    entityId: row.id,
    diff: { kind: input.kind, displayName: input.displayName },
    metadata: { externalAccountId: input.externalAccountId },
  });

  // Build the webhook URL the user pastes back into the messenger's console.
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://earlymedi.vercel.app');
  const webhookUrl = `${appBase}${def.webhookPath}?org=${orgId}&channel=${row.id}`;

  return { channelId: row.id, webhookUrl };
}

export async function disconnectChannelAction(channelId: string): Promise<void> {
  const { userId, orgId } = await requireOrgOwnerOrAdmin();
  await db
    .update(channels)
    .set({ status: 'disconnected', updatedAt: new Date() })
    .where(and(eq(channels.id, channelId), eq(channels.organizationId, orgId)));

  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'update',
    entityType: 'channel',
    entityId: channelId,
    metadata: { reason: 'disconnected' },
  });
}

/**
 * Realistic medical-tourism inquiry samples in 5 languages. Each one
 * mentions a procedure + a timeline so the AI translation + intent
 * classifier have actual content to work with.
 */
const TEST_MESSAGE_SAMPLES: Record<
  'ko' | 'en' | 'zh' | 'ja' | 'ru',
  { displayName: string; countryCode: string; body: string }
> = {
  ko: {
    displayName: '김민지 (시뮬레이션)',
    countryCode: 'KR',
    body: '안녕하세요, 한국에서 코 성형 견적 받고 싶어요. 7월 둘째 주 일정 가능한가요? — (테스트 메시지)',
  },
  en: {
    displayName: 'Emma Johnson (simulated)',
    countryCode: 'US',
    body:
      "Hi, I'm interested in getting rhinoplasty in Seoul. Could you send a quote? I'm available the second week of July. — (test message)",
  },
  zh: {
    displayName: '李小芳 (模拟)',
    countryCode: 'CN',
    body: '你好，我想在韩国做鼻整形,能不能给个报价?7月第二周方便吗? — (测试消息)',
  },
  ja: {
    displayName: '佐藤 美咲 (シミュレーション)',
    countryCode: 'JP',
    body:
      'こんにちは。韓国で鼻の整形を検討していて、見積もりをお願いします。7月第2週は可能ですか? — (テストメッセージ)',
  },
  ru: {
    displayName: 'Анна Иванова (симуляция)',
    countryCode: 'RU',
    body:
      'Здравствуйте, хочу получить смету на ринопластику в Корее. Возможно ли на второй неделе июля? — (тестовое сообщение)',
  },
};

export type TestMessageLocale = keyof typeof TEST_MESSAGE_SAMPLES;

/**
 * Simulates an inbound message arriving via the channel's webhook. Used
 * by the per-flag test buttons on the channels page so an operator can
 * confirm the inbox pipeline (and AI translation) works end-to-end in
 * any of the 5 sample locales without waiting for a real customer message.
 *
 * Returns the conversation id so the UI can deep-link to it.
 */
export async function sendTestMessageAction(
  channelId: string,
  locale: TestMessageLocale = 'ko',
): Promise<{ conversationId: string; locale: TestMessageLocale }> {
  const { orgId } = await requireOrgOwnerOrAdmin();

  // Verify the channel belongs to the caller's org.
  const [channel] = await db
    .select({ id: channels.id, kind: channels.kind })
    .from(channels)
    .where(and(eq(channels.id, channelId), eq(channels.organizationId, orgId)))
    .limit(1);
  if (!channel) throw new Error('channel_not_found');

  const sample = TEST_MESSAGE_SAMPLES[locale];
  const threadId = `test-${locale}-${Date.now()}`;

  const { routeIncomingMessage } = await import('@/lib/channels/inbox-router');
  const result = await routeIncomingMessage({
    organizationId: orgId,
    channelId,
    externalThreadId: threadId,
    externalMessageId: `${threadId}-msg`,
    contact: {
      externalId: threadId,
      displayName: sample.displayName,
      locale,
      countryCode: sample.countryCode,
    },
    body: sample.body,
    bodyLocale: locale,
    sentAt: new Date(),
  });

  return { conversationId: result.conversationId, locale };
}

export async function listChannelsForOrg(orgId: string): Promise<
  Array<{
    id: string;
    kind: string;
    displayName: string;
    externalAccountId: string;
    status: string;
    lastSyncAt: Date | null;
    lastErrorMessage: string | null;
  }>
> {
  return await db
    .select({
      id: channels.id,
      kind: channels.kind,
      displayName: channels.displayName,
      externalAccountId: channels.externalAccountId,
      status: channels.status,
      lastSyncAt: channels.lastSyncAt,
      lastErrorMessage: channels.lastErrorMessage,
    })
    .from(channels)
    .where(eq(channels.organizationId, orgId));
}
