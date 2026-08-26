export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { messages } from '@/drizzle/schema/messages';
import { patients } from '@/drizzle/schema/patients';
import { createPatient } from '@/lib/db/repositories/patients';
import { PaywallError } from '@/lib/billing/trial-quota';

/**
 * 인박스 대화 → 환자 CRM 등록.
 *
 * 컨텍스트 패널의 [+ 환자 CRM에 등록] 버튼이 호출한다. 대화의 컨택트
 * 정보(이름·국가·로케일·채널)로 환자를 만들고, 초기 인바운드 메시지에서
 * 전화·이메일을 찾아 암호화 저장한 뒤 대화에 환자를 연결한다.
 *
 * 멱등: 이미 연결된 대화는 기존 환자 id 를 그대로 돌려주고, 같은 대화로
 * 만들어진 환자가 있으면(경합 등) 새로 만들지 않고 연결만 한다.
 */

/** 초기 인바운드 메시지에서 전화·이메일을 찾아낸다 (리드 폼 라벨 우선). */
function extractContact(bodies: string[]): { phone?: string; email?: string } {
  const text = bodies.join('\n');
  const out: { phone?: string; email?: string } = {};

  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(text);
  if (email) out.email = email[0];

  // "연락처: 01037312061" 같은 라벨 있는 줄을 우선, 없으면 일반 전화 패턴.
  const labeled = /(?:연락처|전화|휴대폰|Phone|Tel|電話|电话)\s*[:：]?\s*(\+?[0-9][0-9\s\-().]{6,19}[0-9])/i.exec(text);
  const generic = /(\+?[0-9][0-9\s\-().]{7,19}[0-9])/.exec(text);
  const raw = labeled?.[1] ?? generic?.[1];
  if (raw) {
    const digits = raw.replace(/[^\d+]/g, '');
    // 날짜·금액 오탐을 줄인다 — 전화로 보기엔 짧거나 긴 것은 버린다.
    if (digits.replace(/\D/g, '').length >= 8 && digits.replace(/\D/g, '').length <= 15) {
      out.phone = digits;
    }
  }
  return out;
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const orgId = access.ctx.orgId;
  const conversationId = params.id;

  try {
    return await withRls(access.ctx, async () => {
      const [conv] = await db
        .select({
          id: conversations.id,
          patientId: conversations.patientId,
          contactDisplayName: conversations.contactDisplayName,
          contactCountryCode: conversations.contactCountryCode,
          contactLocale: conversations.contactLocale,
          channelKind: channels.kind,
        })
        .from(conversations)
        .innerJoin(channels, eq(conversations.channelId, channels.id))
        .where(and(eq(conversations.organizationId, orgId), eq(conversations.id, conversationId)))
        .limit(1);
      if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

      // 이미 연결돼 있으면 그대로 반환 (멱등)
      if (conv.patientId) {
        return NextResponse.json({ data: { patientId: conv.patientId, already: true } });
      }

      // 이 대화로 이미 만들어진 환자가 있으면 연결만 복구한다
      const [existing] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(eq(patients.organizationId, orgId), eq(patients.sourceConversationId, conversationId)),
        )
        .limit(1);
      if (existing) {
        await db
          .update(conversations)
          .set({ patientId: existing.id })
          .where(and(eq(conversations.organizationId, orgId), eq(conversations.id, conversationId)));
        return NextResponse.json({ data: { patientId: existing.id, already: true } });
      }

      // 초기 인바운드 메시지에서 연락처를 찾는다 (리드 폼 본문)
      const inbound = await db
        .select({ body: messages.body })
        .from(messages)
        .where(
          and(
            eq(messages.organizationId, orgId),
            eq(messages.conversationId, conversationId),
            eq(messages.direction, 'inbound'),
          ),
        )
        .orderBy(asc(messages.sentAt))
        .limit(5);
      const contact = extractContact(inbound.map((m) => m.body));

      const countryCode =
        conv.contactCountryCode && /^[A-Za-z]{2}$/.test(conv.contactCountryCode)
          ? conv.contactCountryCode.toUpperCase()
          : undefined;

      const created = await createPatient(orgId, access.ctx.userId, {
        fullName: conv.contactDisplayName?.trim() || '(이름 미상)',
        countryCode,
        locale: conv.contactLocale ?? undefined,
        phone: contact.phone,
        email: contact.email,
        sourceConversationId: conversationId,
        sourceChannel: conv.channelKind,
        tags: ['인박스 등록'],
      });

      await db
        .update(conversations)
        .set({ patientId: created.id })
        .where(and(eq(conversations.organizationId, orgId), eq(conversations.id, conversationId)));

      return NextResponse.json({
        data: { patientId: created.id, duplicateOfId: created.duplicateOfId ?? null },
      });
    });
  } catch (err) {
    if (err instanceof PaywallError) {
      return NextResponse.json(
        {
          error: 'paywall',
          message: `무료 환자 ${err.limit}명 한도를 사용했습니다. 유료 플랜으로 전환해 주세요.`,
          used: err.used,
          limit: err.limit,
          upgradeUrl: '/upgrade',
        },
        { status: 402 },
      );
    }
    throw err;
  }
}
