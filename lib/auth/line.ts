import 'server-only';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

/**
 * 라인 로그인 — Supabase 기본 프로바이더에 라인이 없어서 우리가 다리를 놓는다.
 *
 *   /api/auth/line/start    → 라인 동의 화면 (redirect_uri 는 우리 도메인)
 *   /api/auth/line/callback → code 를 토큰으로 교환 → id_token 검증(라인 서버) →
 *                             이메일로 Supabase 사용자 조회·생성 → 매직링크 OTP 로 세션 발급
 *
 * 이메일이 필요한 이유: 예약 인보이스·바우처·환불 안내가 모두 이메일로 나가고,
 * 같은 사람이 구글·카카오·이메일 어느 쪽으로 들어와도 한 계정으로 묶이게 하려면 이메일이 열쇠다.
 * 라인 채널에서 이메일 권한(Email address permission)을 승인받아야 email 스코프가 내려온다.
 */
export const LINE_AUTH_BASE = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

export function lineConfig(): { channelId: string; channelSecret: string } | null {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID ?? '';
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET ?? '';
  return channelId && channelSecret ? { channelId, channelSecret } : null;
}

export type LineProfile = { sub: string; email: string | null; name: string | null; picture: string | null };

/** 인가 코드 → id_token → 검증된 프로필. 실패 사유는 문자열로 돌려준다. */
export async function exchangeLineCode(code: string, redirectUri: string, nonce: string): Promise<{ ok: true; profile: LineProfile } | { ok: false; error: string }> {
  const cfg = lineConfig();
  if (!cfg) return { ok: false, error: 'line_not_configured' };
  let idToken = '';
  try {
    const res = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: cfg.channelId, client_secret: cfg.channelSecret }),
      cache: 'no-store',
    });
    const j = (await res.json()) as { id_token?: string; error?: string; error_description?: string };
    if (!res.ok || !j.id_token) return { ok: false, error: j.error_description || j.error || 'token_exchange_failed' };
    idToken = j.id_token;
  } catch {
    return { ok: false, error: 'token_exchange_failed' };
  }
  try {
    // 서명·발급자·audience·nonce 검증을 라인 서버에 맡긴다 (직접 JWT 검증할 필요 없음)
    const res = await fetch(LINE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: cfg.channelId, nonce }),
      cache: 'no-store',
    });
    const j = (await res.json()) as { sub?: string; email?: string; name?: string; picture?: string; error_description?: string; error?: string };
    if (!res.ok || !j.sub) return { ok: false, error: j.error_description || j.error || 'id_token_verify_failed' };
    return { ok: true, profile: { sub: j.sub, email: j.email ?? null, name: j.name ?? null, picture: j.picture ?? null } };
  } catch {
    return { ok: false, error: 'id_token_verify_failed' };
  }
}

/**
 * 이메일로 Supabase 사용자를 찾거나 만들고, 로그인용 일회용 코드(OTP)를 돌려준다.
 * 호출부가 이 코드를 verifyOtp 로 소비하면 쿠키 세션이 만들어진다.
 */
export async function lineUserOtp(profile: LineProfile & { email: string }): Promise<{ ok: true; otp: string } | { ok: false; error: string }> {
  const svc = createSupabaseServiceClient();
  const meta = {
    full_name: profile.name ?? undefined,
    avatar_url: profile.picture ?? undefined,
    line_sub: profile.sub,
    provider_hint: 'line',
  };
  try {
    // 이미 있으면 프로필만 갱신, 없으면 생성 (이메일 인증 완료 상태로)
    const { data: link, error: linkErr } = await svc.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    });
    if (!linkErr && link?.properties?.email_otp && link.user) {
      await svc.auth.admin.updateUserById(link.user.id, { user_metadata: { ...(link.user.user_metadata ?? {}), ...meta } }).catch(() => null);
      return { ok: true, otp: link.properties.email_otp };
    }
    // 계정이 없으면 만들고 다시 링크 발급
    const { error: createErr } = await svc.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: { ...meta, signup_source: 'patient_portal' },
    });
    if (createErr && !/already/i.test(createErr.message)) return { ok: false, error: createErr.message };
    const { data: link2, error: linkErr2 } = await svc.auth.admin.generateLink({ type: 'magiclink', email: profile.email });
    if (linkErr2 || !link2?.properties?.email_otp) return { ok: false, error: linkErr2?.message ?? 'link_failed' };
    return { ok: true, otp: link2.properties.email_otp };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'session_failed' };
  }
}
