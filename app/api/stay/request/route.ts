import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { createStayRequest } from '@/lib/stay/request';
import { isPublicLocale } from '@/lib/quote/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * 호텔 예약 문의 접수 — app/[locale]/_components/stay-inquiry-modal.tsx 가 보낸다.
 * 비회원도 접수된다(이름·연락처·메신저·체크인 필수). 로그인 상태면 쿠키 세션에서 계정을 붙여
 * 마이페이지에 '문의 접수 · 견적 대기'로 보이고, 견적이 나오면 거기서 결제한다.
 */
const Schema = z.object({
  locale: z.string().max(5),
  listingSlug: z.string().min(1).max(200),
  name: z.string().min(1).max(120),
  contact: z.string().min(3).max(200),
  countryCode: z.string().length(2).nullable().optional(),
  messengerKind: z.string().max(20).nullable().optional(),
  messengerId: z.string().max(120).nullable().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().int().min(1).max(30),
  arrival: z.string().max(20).nullable().optional(),
  guests: z.number().int().min(1).max(20),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let input: z.infer<typeof Schema>;
  try { input = Schema.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  if (!isPublicLocale(input.locale)) return NextResponse.json({ error: 'bad_locale' }, { status: 400 });

  let userId: string | null = null; let userEmail: string | null = null;
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    userId = data.user?.id ?? null; userEmail = data.user?.email ?? null;
  } catch { /* 비회원 */ }

  const r = await createStayRequest({
    locale: input.locale, listingSlug: input.listingSlug,
    name: input.name.trim(), contact: input.contact.trim(), countryCode: input.countryCode ?? null,
    messengerKind: input.messengerKind?.trim() || null, messengerId: input.messengerId?.trim() || null,
    checkIn: input.checkIn, nights: input.nights, arrival: input.arrival?.trim() || null, guests: input.guests, note: input.note?.trim() || null,
    userId, userEmail,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === 'listing_not_found' ? 404 : 400 });
  return NextResponse.json({ ok: true, invoiceNo: r.invoiceNo, member: !!userId, pay: r.pay, amountWon: r.amountWon });
}
