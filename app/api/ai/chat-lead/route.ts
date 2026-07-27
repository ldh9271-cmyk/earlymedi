import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { submitPublicInquiryAction } from '@/app/[locale]/(public-portal)/inquiry/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * AI 상담 대화 리드 저장.
 *
 * 대화가 일정 길이를 넘으면 클라이언트가 연락처 폼을 띄우고, 제출 시
 * 이 라우트로 대화 전문 + 연락처를 보낸다. 기존 공개 문의 파이프라인을
 * 재사용해 에이전시 인박스에 'AI 상담 리드'로 적재된다 —
 * interests=[ai_chat] 으로 필터 가능.
 *
 * 대화는 서버에 별도 저장하지 않고 인박스 메시지 본문에만 담는다
 * (상담사가 문맥을 그대로 이어받도록).
 */

const InputSchema = z.object({
  locale: z.string(),
  name: z.string().min(1).max(120),
  countryCode: z.string().min(2).max(2),
  contact: z.string().max(200).optional().default(''),
  messenger: z.string().max(200).optional().default(''),
  email: z.string().max(200).optional().default(''),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).min(1).max(40),
});

export async function POST(req: Request): Promise<NextResponse> {
  let input: z.infer<typeof InputSchema>;
  try {
    input = InputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale: PublicLocale = isPublicLocale(input.locale) ? (input.locale as PublicLocale) : 'kr';

  const transcript = input.messages
    .map((m) => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content.replace(/\s+/g, ' ').slice(0, 600)}`)
    .join('\n');
  const memo =
    `[AI 상담 리드]\n` +
    `이메일: ${input.email || '(미입력)'}\n` +
    `메신저: ${input.messenger || '(미입력)'}\n\n` +
    `— 대화 내용 —\n${transcript}`;

  const result = await submitPublicInquiryAction({
    locale,
    hospitalId: null,
    hospitalName: null,
    name: input.name,
    countryCode: input.countryCode.toUpperCase(),
    contact: input.contact || input.email || input.messenger || '(미입력)',
    interests: ['ai_chat'],
    memo,
  });
  if (!result.ok) {
    return NextResponse.json({ error: 'lead_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
