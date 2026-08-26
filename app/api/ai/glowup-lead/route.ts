import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { submitPublicInquiryAction } from '@/app/[locale]/(public-portal)/inquiry/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * AI Glow-Up 분석 결과 리드 수집 + 이메일 리포트 발송.
 *
 *  1. DB: 기존 공개 문의 파이프라인(submitPublicInquiryAction)을 재사용
 *     — 에이전시 인박스에 'AI 얼굴 분석 리드'로 적재되어 카카오/웹
 *     문의와 같은 화면에서 관리된다.
 *  2. Email: RESEND_API_KEY 가 설정돼 있으면 Resend REST 로 분석
 *     리포트 HTML 을 고객 이메일로 발송. 키가 없으면 리드만 저장하고
 *     emailed:false 로 응답 (클라이언트가 안내 문구 분기).
 *
 * 발신 주소는 RESEND_FROM (기본 noreply@glowuptour.com) — Resend 에서
 * glowuptour.com 도메인 인증 필요.
 */

const InputSchema = z.object({
  locale: z.string(),
  name: z.string().min(1).max(120),
  countryCode: z.string().min(2).max(2),
  contact: z.string().max(200).optional().default(''),
  messenger: z.string().max(200).optional().default(''),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  email: z.string().email().max(200),
  analysis: z.object({
    personalColorSeason: z.string().max(40),
    personalColorNote: z.string().max(1000),
    skinNote: z.string().max(1000),
    hairNote: z.string().max(1000),
    browNote: z.string().max(1000),
    overallNote: z.string().max(1000),
  }),
  recs: z.array(z.object({
    key: z.string().max(40),
    items: z.array(z.object({
      title: z.string().max(200),
      href: z.string().max(300),
      img: z.string().nullable(),
      promo: z.string().nullable(),
    })).max(4),
  })).max(8),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmailHtml(
  input: z.infer<typeof InputSchema>,
  labels: { resultTitle: string; recTitle: string; catTitles: Record<string, string> },
): string {
  const a = input.analysis;
  const notes = [a.personalColorNote, a.skinNote, a.hairNote, a.browNote]
    .filter(Boolean)
    .map((n) => `<li style="margin:0 0 10px;line-height:1.6;">${esc(n)}</li>`)
    .join('');
  const recBlocks = input.recs
    .map((section) => {
      const items = section.items
        .map((item) => {
          const url = item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}`;
          const promo = item.promo ? ` <span style="color:#6a6a6a;font-weight:400;">· ${esc(item.promo)}</span>` : '';
          return `<li style="margin:0 0 8px;line-height:1.5;"><a href="${url}" style="color:#ff385c;font-weight:600;text-decoration:none;">${esc(item.title)}</a>${promo}</li>`;
        })
        .join('');
      const title = labels.catTitles[section.key] ?? section.key;
      return `<h3 style="font-size:15px;margin:18px 0 8px;color:#222;">${esc(title)}</h3><ul style="margin:0;padding-left:18px;">${items}</ul>`;
    })
    .join('');

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo',sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="text-align:center;padding:10px 0 18px;">
      <span style="font-size:22px;font-weight:800;color:#ff385c;letter-spacing:-0.5px;">glow-up</span>
    </div>
    <div style="background:#fff;border:1px solid #ebebeb;border-radius:16px;padding:26px 24px;">
      <h1 style="font-size:19px;margin:0 0 4px;">${esc(labels.resultTitle)}</h1>
      <div style="margin:14px 0 0;">
        <span style="display:inline-block;background:#ff385c;color:#fff;border-radius:9999px;padding:6px 16px;font-size:13px;font-weight:700;text-transform:capitalize;">${esc(a.personalColorSeason)}</span>
      </div>
      <p style="margin:14px 0 0;line-height:1.6;color:#3f3f3f;">${esc(a.overallNote)}</p>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <ul style="margin:0;padding-left:18px;color:#3f3f3f;">${notes}</ul>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <h2 style="font-size:17px;margin:0;">${esc(labels.recTitle)}</h2>
      ${recBlocks}
      <div style="text-align:center;margin-top:26px;">
        <a href="${SITE_URL}" style="display:inline-block;background:#ff385c;color:#fff;border-radius:10px;padding:12px 26px;font-weight:700;font-size:15px;text-decoration:none;">GlowUpTour</a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin:16px 0 0;">© GlowUpTour · glowuptour.com</p>
  </div>
</body></html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'GlowUpTour <noreply@glowuptour.com>',
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof InputSchema>;
  try {
    parsed = InputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale: PublicLocale = isPublicLocale(parsed.locale) ? (parsed.locale as PublicLocale) : 'kr';
  const dict = await getDictionary(locale);

  // 1. 인박스 리드 적재 — 분석 요약 + 연락 채널을 memo 로 구성.
  const a = parsed.analysis;
  const recLines = parsed.recs
    .map((s) => `- ${s.key}: ${s.items.map((i) => i.title).join(', ')}`)
    .join('\n');
  const memo =
    `[AI 얼굴 분석 리드]\n` +
    `이메일: ${parsed.email}\n` +
    `메신저: ${parsed.messenger || '(미입력)'}\n\n` +
    `퍼스널컬러: ${a.personalColorSeason}\n` +
    `종합: ${a.overallNote}\n\n` +
    `추천 노출:\n${recLines}`;

  const result = await submitPublicInquiryAction({
    locale,
    hospitalId: null,
    hospitalName: null,
    name: parsed.name,
    countryCode: parsed.countryCode.toUpperCase(),
    contact: parsed.contact || parsed.email,
    birthDate: parsed.birthDate ?? null,
    interests: ['ai_face_analysis'],
    memo,
  });
  if (!result.ok) {
    return NextResponse.json({ error: 'lead_failed' }, { status: 502 });
  }

  // 2. 이메일 리포트 발송 (키 없으면 skip).
  const catTitles: Record<string, string> = {
    clinic: dict.header.catHospital,
    personal_color: dict.pcCategory.color.title,
    hair: dict.pcCategory.hair.title,
    nail: dict.pcCategory.nail.title,
    pmu: dict.pcCategory.pmu.title,
  };
  const html = buildEmailHtml(parsed, {
    resultTitle: dict.ai.upload.resultTitle,
    recTitle: dict.ai.upload.recTitle,
    catTitles,
  });
  const emailed = await sendEmail(
    parsed.email,
    `${dict.ai.upload.resultTitle} · GlowUpTour`,
    html,
  );

  return NextResponse.json({ ok: true, emailed });
}
