/**
 * AI 상담 '대화로 예약 요청' — 프롬프트 지시문, 모델이 낸 초안의 검증·병원 확정, 진료시간 경고.
 * 실제 예약 요청 생성은 /api/ai/chat/booking (회원 확인 후 기존 문의 폼 액션 재사용).
 */
import { z } from 'zod';
import { isWithinBookingWindow } from '@/lib/booking/window';
import { checkVisitSlot, type SlotIssue } from '@/lib/booking/visit-slot';
import type { WeeklyHours } from '@/lib/hours/status';

/** 예약 의도 — 최근 사용자 발화에 있으면 BOOKING 지시문·회원 프로필을 프롬프트에 넣는다 */
export const BOOKING_INTENT = /예약|reserv|\bbook|appoint|予約|预约|預約|запис|бронир|đặt lịch|đặt hẹn|đặt chỗ/i;

export const MESSENGERS = ['WhatsApp', 'KakaoTalk', 'LINE', 'WeChat', 'Telegram', 'Zalo', 'Viber', 'Instagram'] as const;

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hm = z.preprocess((v) => {
  const m = typeof v === 'string' ? /^(\d{1,2})[:시](\d{2})?\s*$/.exec(v.trim()) : null;
  return m ? `${String(Number(m[1])).padStart(2, '0')}:${m[2] ?? '00'}` : v;
}, z.string().regex(/^\d{2}:\d{2}$/));
const optText = (max: number) => z.string().max(max).nullish().transform((v) => (v ?? '').trim());

/** 모델이 <booking> 블록에 넣는 값 */
export const BookingDraftSchema = z.object({
  hospital: z.string().min(1).max(200),
  visitYmd: ymd,
  visitTime: hm,
  name: z.string().min(1).max(120),
  gender: z.enum(['female', 'male', 'other']),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).transform((s) => s.toUpperCase()),
  phone: z.string().min(3).max(40),
  messengerType: z.string().min(1).max(20),
  messengerId: z.string().min(1).max(120),
  email: optText(200),
  birthDate: ymd,
  memo: optText(2000),
});
export type BookingDraftInput = z.infer<typeof BookingDraftSchema>;

/** 카드·API 가 쓰는 확정 초안 (병원 id 확정) */
export type BookingDraft = BookingDraftInput & { hospitalId: string; hospitalName: string };
export type BookingIssue = 'window' | SlotIssue;
export type BookingPayload = { draft: BookingDraft; issues: BookingIssue[]; hoursText: string | null };

export type ClinicRef = { hospitalId: string; hospitalName: string; title: string; hours: WeeklyHours | null; hoursText: string | null };

const norm = (s: string): string => s.toLowerCase().replace(/[\s()（）·.,'"]+/g, '');

/** 모델 출력(raw JSON) → 검증 + DATA 병원과 짝 맞추기 + 일시 경고. 병원을 못 찾으면 null(카드 없음) */
export function resolveBookingDraft(raw: unknown, ctx: { clinics: ClinicRef[]; holidays?: ReadonlySet<string>; now?: Date }): BookingPayload | null {
  const parsed = BookingDraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  const want = norm(d.hospital);
  const clinic =
    ctx.clinics.find((c) => norm(c.hospitalName) === want || norm(c.title) === want) ??
    ctx.clinics.find((c) => want.includes(norm(c.hospitalName)) || want.includes(norm(c.title)) || norm(c.hospitalName).includes(want) || norm(c.title).includes(want));
  if (!clinic) return null;
  const now = ctx.now ?? new Date();
  const issues: BookingIssue[] = [];
  if (!isWithinBookingWindow(d.visitYmd, now)) issues.push('window');
  else {
    const slot = checkVisitSlot(clinic.hours, d.visitYmd, d.visitTime, ctx.holidays ?? new Set(), now);
    if (slot) issues.push(slot);
  }
  return { draft: { ...d, hospitalId: clinic.hospitalId, hospitalName: clinic.hospitalName }, issues, hoursText: clinic.hoursText };
}

export type MemberProfile = {
  name?: string | null; gender?: string | null; countryCode?: string | null; phone?: string | null;
  messengerType?: string | null; messengerId?: string | null; email?: string | null; birthDate?: string | null;
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 시스템 프롬프트의 BOOKING 절 — 예약 의도가 있을 때만 넣는다 */
export function bookingPrompt(opts: { todayYmd: string; member: boolean; profile: MemberProfile | null }): string {
  const weekday = WEEKDAY[new Date(`${opts.todayYmd}T00:00:00Z`).getUTCDay()] ?? '';
  const p = opts.profile;
  const profileLines = p
    ? Object.entries({ name: p.name, gender: p.gender, countryCode: p.countryCode, phone: p.phone, messenger: p.messengerType && p.messengerId ? `${p.messengerType} ${p.messengerId}` : null, email: p.email, birthDate: p.birthDate })
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
    : '';
  return `BOOKING (clinic visit request) — the user wants to reserve a clinic visit. Today in Korea: ${opts.todayYmd} (${weekday}).
- Collect what is still missing, one or two items per turn, conversationally (never dump a long form): the clinic (one from DATA — if several fit, ask which), preferred date (within 3 months from today, Korea time) and time (24-hour) that fits that clinic's 진료시간 in DATA (avoid closed days, lunch and holidays; if the wish conflicts, propose the nearest option), full name, gender (female/male/other), nationality as a 2-letter country code, phone with country code, messenger app (${MESSENGERS.join(', ')}) and ID, date of birth, email (optional), and a one-line note of what they want (memo).
- Reuse anything already given in the conversation${p ? ' or in MEMBER PROFILE' : ''}; never ask twice. Resolve relative dates ("next Tuesday", "来週の火曜日") to an exact date and say it back.
${p ? `- MEMBER PROFILE (logged-in user — use these unless the user says they differ): ${profileLines || '(empty)'}\n` : opts.member ? '' : '- The user is not signed in. Collect the details anyway; the card will ask them to sign in before sending (their draft is kept).\n'}- Once every required item is known, write a short summary in the user's language, tell them to check the card below and press its send button, then append this block as the very last line (machine-read, hidden from the user; one line of JSON, no comments, no code fence):
<booking>{"hospital":"<exact clinic name from DATA>","visitYmd":"YYYY-MM-DD","visitTime":"HH:mm","name":"","gender":"female|male|other","countryCode":"XX","phone":"","messengerType":"WhatsApp","messengerId":"","email":"","birthDate":"YYYY-MM-DD","memo":""}</booking>
- Pressing the button sends a visit REQUEST; the clinic confirms the final date and time and the user then gets a confirmation email with a QR. Never say the reservation is confirmed, and never invent availability.
- If the user changes a detail after the card appeared, output a corrected block again.`;
}
