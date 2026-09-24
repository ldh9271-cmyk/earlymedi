'use server';

import 'server-only';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { submitPublicInquiryAction } from '../../inquiry/actions';

/**
 * 계정 삭제 요청 (Google Play '계정 삭제' 정책용 웹 경로).
 *
 * 자동 삭제는 하지 않는다 — 결제·예약·외국인환자 유치 기록은 법정 보관 기간이 있어 운영자가
 * 가려서 지워야 하기 때문. 요청은 운영 인박스(1:1 문의와 같은 대화)로 들어가고 텔레그램 알림이
 * 가며, 개인정보처리방침 4조대로 30일 안에 처리한 뒤 회원에게 이메일로 알린다.
 * 같은 회원이 다시 누르지 않도록 user_metadata.deletion_requested_at 에 시각을 남긴다.
 */
const Input = z.object({
  locale: z.enum(['kr', 'en', 'zh', 'ja', 'ru', 'vi']),
  reason: z.string().max(1000),
});

export async function requestAccountDeletionAction(raw: z.infer<typeof Input>): Promise<{ ok: true; at: string } | { ok: false; error: string }> {
  const input = Input.parse(raw);
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false, error: 'login_required' };

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const prev = typeof meta.deletion_requested_at === 'string' ? meta.deletion_requested_at : null;
  if (prev) return { ok: true, at: prev };

  const at = new Date().toISOString();
  const name = String(meta.full_name ?? meta.name ?? meta.nickname ?? user.email ?? 'member').slice(0, 120);
  const ccRaw = typeof meta.country === 'string' ? meta.country : typeof meta.country_code === 'string' ? meta.country_code : '';
  const countryCode = /^[a-z]{2}$/i.test(ccRaw) ? ccRaw.toUpperCase() : 'XX';

  const res = await submitPublicInquiryAction({
    locale: input.locale,
    hospitalId: null,
    name,
    countryCode,
    contact: user.email ?? user.phone ?? user.id,
    interests: [],
    memo: [
      '[계정 삭제 요청 / Account deletion request]',
      `회원 ID: ${user.id}`,
      `이메일: ${user.email ?? '-'}`,
      `요청 시각: ${at}`,
      `사유: ${input.reason.trim() || '-'}`,
      '→ 30일 이내 처리(개인정보처리방침 4조: 법정 보관 기록 제외 삭제) 후 회원에게 이메일로 완료 안내',
    ].join('\n'),
  });
  if (!res.ok) return { ok: false, error: res.error };

  // 중복 요청 방지 표시 — 실패해도 요청 자체는 접수됐으므로 무시
  await supabase.auth.updateUser({ data: { deletion_requested_at: at } }).catch(() => undefined);
  return { ok: true, at };
}
