import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiFaceAnalyses } from '@/drizzle/schema/ai-face-analyses';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { submitPublicInquiryAction } from '@/app/[locale]/(public-portal)/inquiry/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * AI 얼굴 분석 결과 — 회원 계정 이메일로 리포트 발송 + 인박스 리드.
 *
 *  - 로그인 필수 (사진 업로드 → 분석 → '이메일로 받기' → 회원가입/로그인 → 복귀 → 자동 발송).
 *    계정 이메일로만 보내 타인 이메일 스팸을 막는다 (AI 여행하기와 같은 규칙).
 *  - 리드: 기존 공개 문의 파이프라인(submitPublicInquiryAction)으로 에이전시 인박스에 적재.
 *  - Email: RESEND_API_KEY 가 있으면 Resend REST 로 분석 리포트 HTML 발송, 없으면 emailed:false.
 */
const Body = z.object({
  locale: z.string(),
  analysisId: z.string().uuid(),
  contact: z.object({ phone: z.string().max(40).optional(), messenger: z.string().max(100).optional(), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')) }).optional(),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildEmailHtml(
  a: { personalColorSeason: string; personalColorNote: string; skinNote: string; hairNote: string; browNote: string; overallNote: string },
  recs: Array<{ key: string; items: Array<{ title: string; href: string; promo: string | null }> }>,
  labels: { resultTitle: string; recTitle: string; catTitles: Record<string, string> },
): string {
  const notes = [a.personalColorNote, a.skinNote, a.hairNote, a.browNote].filter(Boolean)
    .map((n) => `<li style="margin:0 0 10px;line-height:1.6;">${esc(n)}</li>`).join('');
  const recBlocks = recs.map((section) => {
    const items = section.items.map((item) => {
      const url = item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}`;
      const promo = item.promo ? ` <span style="color:#6a6a6a;font-weight:400;">· ${esc(item.promo)}</span>` : '';
      return `<li style="margin:0 0 8px;line-height:1.5;"><a href="${url}" style="color:#ff385c;font-weight:600;text-decoration:none;">${esc(item.title)}</a>${promo}</li>`;
    }).join('');
    return `<h3 style="font-size:15px;margin:18px 0 8px;color:#222;">${esc(labels.catTitles[section.key] ?? section.key)}</h3><ul style="margin:0;padding-left:18px;">${items}</ul>`;
  }).join('');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo',sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="text-align:center;padding:10px 0 18px;"><span style="font-size:22px;font-weight:800;color:#ff385c;letter-spacing:-0.5px;">glow-up</span></div>
    <div style="background:#fff;border:1px solid #ebebeb;border-radius:16px;padding:26px 24px;">
      <h1 style="font-size:19px;margin:0 0 4px;">${esc(labels.resultTitle)}</h1>
      <div style="margin:14px 0 0;"><span style="display:inline-block;background:#ff385c;color:#fff;border-radius:9999px;padding:6px 16px;font-size:13px;font-weight:700;text-transform:capitalize;">${esc(a.personalColorSeason)}</span></div>
      <p style="margin:14px 0 0;line-height:1.6;color:#3f3f3f;">${esc(a.overallNote)}</p>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <ul style="margin:0;padding-left:18px;color:#3f3f3f;">${notes}</ul>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <h2 style="font-size:17px;margin:0;">${esc(labels.recTitle)}</h2>
      ${recBlocks}
      <div style="text-align:center;margin-top:26px;"><a href="${SITE_URL}" style="display:inline-block;background:#ff385c;color:#fff;border-radius:10px;padding:12px 26px;font-weight:700;font-size:15px;text-decoration:none;">GlowUpTour</a></div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin:16px 0 0;">© GlowUpTour · glowuptour.com</p>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'GlowUpTour <noreply@glowuptour.com>', to: [to], subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const locale: PublicLocale = isPublicLocale(body.locale) ? (body.locale as PublicLocale) : 'kr';

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const [row] = await db.select().from(aiFaceAnalyses).where(eq(aiFaceAnalyses.id, body.analysisId)).limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.userId && row.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const a = row.analysis;
  const um = (user.user_metadata ?? {}) as { full_name?: string; name?: string; country_code?: string; phone?: string; messenger_kind?: string; messenger_id?: string };
  const contact = {
    phone: body.contact?.phone?.trim() || um.phone || undefined,
    messenger: body.contact?.messenger?.trim() || (um.messenger_id ? `${um.messenger_kind ? um.messenger_kind + ' ' : ''}${um.messenger_id}` : undefined),
    birthDate: body.contact?.birthDate || undefined,
  };
  const dict = await getDictionary(locale);

  // 1. 인박스 리드 (기존 파이프라인) — 최초 발송 시 1회
  if (!row.emailedAt) {
    const recLines = row.recs.map((s) => `- ${s.key}: ${s.items.map((i) => i.title).join(', ')}`).join('\n');
    const memo = `[AI 얼굴 분석 리드]\n이메일: ${user.email}\n메신저: ${contact.messenger ?? '(미입력)'}\n\n퍼스널컬러: ${a.personalColorSeason}\n종합: ${a.overallNote}\n\n추천 노출:\n${recLines}`;
    await submitPublicInquiryAction({
      locale, hospitalId: null, hospitalName: null,
      name: um.full_name || um.name || user.email.split('@')[0] || 'guest',
      countryCode: (um.country_code ?? 'KR').toUpperCase().slice(0, 2),
      contact: contact.phone || contact.messenger || user.email,
      birthDate: contact.birthDate ?? null, interests: ['ai_face_analysis'], memo,
    }).catch(() => null);
  }

  // 2. 이메일 리포트 발송 (계정 이메일로만)
  const catTitles: Record<string, string> = {
    clinic: dict.header.catHospital, personal_color: dict.pcCategory.color.title, hair: dict.pcCategory.hair.title,
    nail: dict.pcCategory.nail.title, pmu: dict.pcCategory.pmu.title,
  };
  const html = buildEmailHtml(a, row.recs, { resultTitle: dict.ai.upload.resultTitle, recTitle: dict.ai.upload.recTitle, catTitles });
  const emailed = await sendEmail(user.email, `${dict.ai.upload.resultTitle} · GlowUpTour`, html);
  await db.update(aiFaceAnalyses).set({ userId: user.id, email: user.email, contact, emailedAt: emailed ? new Date() : row.emailedAt, updatedAt: new Date() }).where(eq(aiFaceAnalyses.id, row.id));
  return NextResponse.json({ ok: true, emailed, email: user.email });
}
