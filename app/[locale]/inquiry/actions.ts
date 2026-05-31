'use server';

import 'server-only';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { channels } from '@/drizzle/schema/channels';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { auditLogs } from '@/drizzle/schema/audit';
import { detectLocale } from '@/lib/ai/translation';

/**
 * Public inquiry intake — no Supabase session, no RLS context.
 *
 * Routing: every submission lands in the intake agency's inbox. The
 * intake agency is configured via env (INTAKE_AGENCY_ORG_ID); if
 * unset, we pick the first agency org we find. The submission appears
 * as a synthetic 'web' channel conversation alongside KakaoTalk /
 * WeChat threads — same inbox UI, same AI translation pipeline.
 *
 * Bot-protection (rate limits, captcha) is left to a reverse-proxy
 * layer (Vercel Edge Config / Cloudflare). For now we trust the form
 * and rely on Supabase Auth never being a target of these requests.
 */

const InputSchema = z.object({
  locale: z.enum(['kr', 'en', 'zh', 'ja']),
  hospitalId: z.string().uuid().nullable(),
  name: z.string().min(1).max(120),
  countryCode: z.string().length(2),
  contact: z.string().min(1).max(200),
  interests: z.array(z.string()).max(20),
  memo: z.string().max(4000),
});

export type PublicInquiryInput = z.infer<typeof InputSchema>;
export type PublicInquiryResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

async function resolveIntakeOrgId(): Promise<string | null> {
  const envOverride = process.env.INTAKE_AGENCY_ORG_ID;
  if (envOverride) return envOverride;

  // Fall back to the first agency org. Deterministic order: by creation
  // date ascending so the founder agency wins on a fresh install.
  const [first] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.accountType, 'agency'))
    .orderBy(sql`${organizations.createdAt} asc`)
    .limit(1);
  return first?.id ?? null;
}

/**
 * Ensures a synthetic "web inquiry" channel exists for the intake org
 * so the inbox can classify these conversations as a distinct source
 * (filterable in the channel picker, separate webhook/sync metadata).
 */
async function ensureWebInquiryChannel(orgId: string): Promise<string> {
  const [existing] = await db
    .select({ id: channels.id })
    .from(channels)
    .where(
      and(
        eq(channels.organizationId, orgId),
        eq(channels.kind, 'web'),
        eq(channels.externalAccountId, 'public-inquiry-form'),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(channels)
    .values({
      organizationId: orgId,
      kind: 'web',
      displayName: '환자 포털 1:1 문의',
      externalAccountId: 'public-inquiry-form',
      status: 'connected',
      lastSyncAt: new Date(),
    })
    .returning({ id: channels.id });
  if (!created) throw new Error('channel_create_failed');
  return created.id;
}

export async function submitPublicInquiryAction(
  raw: PublicInquiryInput,
): Promise<PublicInquiryResult> {
  const input = InputSchema.parse(raw);

  // 1. Decide which agency receives this inquiry.
  const intakeOrgId = await resolveIntakeOrgId();
  if (!intakeOrgId) {
    return {
      ok: false,
      error: '아직 협력 Agency가 등록되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  // 2. Get-or-create the "web" channel for that org.
  const channelId = await ensureWebInquiryChannel(intakeOrgId);

  // 3. Build the conversation + first message body.
  //    threadId is unique per submission (we don't want to merge
  //    different inquiries by the same person into one conversation).
  const threadId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const interestsLine = input.interests.length > 0
    ? `\n관심 분야: ${input.interests.join(', ')}`
    : '';
  const hospitalLine = input.hospitalId
    ? `\n관심 병원 ID: ${input.hospitalId}`
    : '';
  const composedBody =
    `[환자 포털 문의 · ${input.locale.toUpperCase()}]\n` +
    `이름: ${input.name} (${input.countryCode})\n` +
    `연락처: ${input.contact}${interestsLine}${hospitalLine}\n\n` +
    `${input.memo || '(별도 메모 없음)'}`;

  // 4. Insert conversation + message + audit log in one transaction-ish
  //    sequence. Drizzle's HTTP driver doesn't expose proper
  //    transactions, but the ordering is fine: conversation first,
  //    then dependent message.
  const [conv] = await db
    .insert(conversations)
    .values({
      organizationId: intakeOrgId,
      channelId,
      externalThreadId: threadId,
      contactDisplayName: input.name,
      contactExternalId: input.contact,
      contactCountryCode: input.countryCode,
      contactLocale: input.locale === 'kr' ? 'ko' : input.locale,
      stage: 'lead',
      priority: 'normal',
      unreadCount: 1,
      lastInboundAt: new Date(),
    })
    .returning({ id: conversations.id });
  if (!conv) return { ok: false, error: 'conversation_create_failed' };

  // detectLocale will look at the memo body; fall back to the locale
  // chosen in the UI if the body is too short to classify.
  const detected = detectLocale(input.memo);
  const bodyLocale = detected === 'other' ? (input.locale === 'kr' ? 'ko' : input.locale) : detected;

  await db.insert(messages).values({
    organizationId: intakeOrgId,
    conversationId: conv.id,
    direction: 'inbound',
    senderRole: 'patient',
    contentType: 'text',
    body: composedBody,
    bodyLocale,
    sentAt: new Date(),
    status: 'delivered',
    metadata: {
      source: 'public_inquiry',
      portalLocale: input.locale,
      countryCode: input.countryCode,
      contact: input.contact,
      interests: input.interests,
      hospitalId: input.hospitalId ?? undefined,
    },
  });

  await db.insert(auditLogs).values({
    organizationId: intakeOrgId,
    actorUserId: null,
    action: 'create',
    entityType: 'conversation',
    entityId: conv.id,
    diff: {
      source: 'public_inquiry',
      portalLocale: input.locale,
      countryCode: input.countryCode,
    },
    metadata: { contact: input.contact },
  });

  return { ok: true, conversationId: conv.id };
}
