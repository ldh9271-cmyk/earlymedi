import 'server-only';
import { randomInt } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { sendEmail } from '@/lib/email/send';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * 비밀번호 찾기 = 임시 비밀번호 발급 (2026-10-03, 사용자 지시).
 *
 * 예전 Supabase 복구 링크 방식은 메일이 한국어 템플릿 한 가지뿐이고, 메일 앱이 다른 브라우저로
 * 링크를 열면 PKCE 코드를 교환할 수 없어 비밀번호 변경이 실패했다. 대신:
 *   1) 가입 이메일로 임시 비밀번호를 회원의 언어로 보낸다 (Resend, 6개 언어)
 *   2) 그 비밀번호로 로그인하면 user_metadata.must_change_password 가 켜져 있어
 *      /[locale]/account/password 로 보내 새 비밀번호를 받는다
 *
 * 계정이 없는 이메일은 'no_user' 로 돌려주고 호출부가 안내한다. 메일 인증을 안 끝낸
 * 계정은 이 메일을 받은 것으로 인증을 완료 처리해 로그인이 막히지 않게 한다.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';
// 헷갈리는 글자(0/O, 1/l/I) 제외
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export const TEMP_PASSWORD_LENGTH = 10;

export function generateTempPassword(): string {
  let out = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

type Copy = {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  steps: string[];
  ignore: string;
  loginCta: string;
};

const COPY: Record<PublicLocale, Copy> = {
  kr: {
    subject: '[GlowUpTour] 임시 비밀번호 안내',
    greeting: (n) => `${n}님, 안녕하세요.`,
    intro: '요청하신 임시 비밀번호입니다.',
    steps: ['아래 임시 비밀번호로 로그인해 주세요.', '로그인하면 바로 새 비밀번호를 정하는 화면이 열립니다. 새 비밀번호로 바꿔 주세요.'],
    ignore: '본인이 요청하지 않았다면 이 메일을 무시하지 마시고 바로 로그인해 비밀번호를 새로 정해 주세요. 임시 비밀번호는 이 메일을 받은 분만 알 수 있습니다.',
    loginCta: '로그인하기',
  },
  en: {
    subject: '[GlowUpTour] Your temporary password',
    greeting: (n) => `Hi ${n},`,
    intro: 'Here is the temporary password you requested.',
    steps: ['Sign in with the temporary password below.', 'Right after signing in you will be asked to set a new password. Please choose a new one.'],
    ignore: 'If you did not request this, sign in now and set a new password. Only the owner of this mailbox can see the temporary password.',
    loginCta: 'Sign in',
  },
  ja: {
    subject: '[GlowUpTour] 仮パスワードのご案内',
    greeting: (n) => `${n} 様`,
    intro: 'ご依頼の仮パスワードです。',
    steps: ['下記の仮パスワードでログインしてください。', 'ログイン直後に新しいパスワードを設定する画面が開きます。新しいパスワードに変更してください。'],
    ignore: 'ご本人のご依頼でない場合は、すぐにログインして新しいパスワードを設定してください。仮パスワードはこのメールの受信者だけが確認できます。',
    loginCta: 'ログイン',
  },
  zh: {
    subject: '[GlowUpTour] 临时密码',
    greeting: (n) => `${n}，您好。`,
    intro: '这是您申请的临时密码。',
    steps: ['请使用下方临时密码登录。', '登录后会立即进入设置新密码的页面，请修改为新密码。'],
    ignore: '如果不是您本人申请，请立即登录并设置新密码。临时密码仅此邮箱的持有者可见。',
    loginCta: '登录',
  },
  ru: {
    subject: '[GlowUpTour] Временный пароль',
    greeting: (n) => `Здравствуйте, ${n}!`,
    intro: 'Вот временный пароль, который вы запросили.',
    steps: ['Войдите с временным паролем ниже.', 'Сразу после входа откроется экран смены пароля — задайте новый пароль.'],
    ignore: 'Если вы не запрашивали пароль, войдите сейчас и задайте новый. Временный пароль видит только владелец этой почты.',
    loginCta: 'Войти',
  },
  vi: {
    subject: '[GlowUpTour] Mật khẩu tạm thời',
    greeting: (n) => `Xin chào ${n},`,
    intro: 'Đây là mật khẩu tạm thời bạn đã yêu cầu.',
    steps: ['Đăng nhập bằng mật khẩu tạm thời bên dưới.', 'Ngay sau khi đăng nhập, màn hình đặt mật khẩu mới sẽ mở ra. Hãy đổi sang mật khẩu mới.'],
    ignore: 'Nếu bạn không yêu cầu, hãy đăng nhập ngay và đặt mật khẩu mới. Chỉ chủ hộp thư này mới thấy được mật khẩu tạm thời.',
    loginCta: 'Đăng nhập',
  },
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildTempPasswordEmail(locale: PublicLocale, name: string, tempPassword: string): { subject: string; html: string } {
  const c = COPY[locale];
  const loginUrl = `${SITE_URL}/${locale}/login`;
  const steps = c.steps.map((s) => `<li style="margin:0 0 8px;line-height:1.6;">${esc(s)}</li>`).join('');
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo',sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="text-align:center;padding:10px 0 18px;"><span style="font-size:22px;font-weight:800;color:#ff385c;letter-spacing:-0.5px;">glow-up</span></div>
    <div style="background:#fff;border:1px solid #ebebeb;border-radius:16px;padding:26px 24px;">
      <p style="margin:0 0 12px;line-height:1.6;">${esc(c.greeting(name))}</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(c.intro)}</p>
      <div style="text-align:center;margin:18px 0;"><span style="display:inline-block;font-family:Menlo,Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:3px;background:#fff7f8;border:1px solid #ffd1da;border-radius:10px;padding:12px 20px;color:#222;">${esc(tempPassword)}</span></div>
      <ol style="margin:0 0 16px;padding-left:20px;color:#3f3f3f;">${steps}</ol>
      <div style="text-align:center;margin:22px 0 6px;"><a href="${loginUrl}" style="display:inline-block;background:#ff385c;color:#fff;border-radius:10px;padding:12px 26px;font-weight:700;font-size:15px;text-decoration:none;">${esc(c.loginCta)}</a></div>
      <hr style="border:none;border-top:1px solid #ebebeb;margin:18px 0;" />
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6a6a6a;">${esc(c.ignore)}</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin:16px 0 0;">© GlowUpTour · glowuptour.com</p>
  </div></body></html>`;
  return { subject: c.subject, html };
}

type AuthUserRow = { id: string; email: string; raw_user_meta_data: Record<string, unknown> | null };

/**
 * 임시 비밀번호를 만들어 계정에 적용하고 메일을 보낸다.
 * 반환값은 호출부 응답과 무관하게 내부 기록용 — 계정이 없어도 호출부는 ok 를 돌려준다.
 */
export async function issueTempPassword(email: string, locale: PublicLocale): Promise<'sent' | 'no_user' | 'update_failed' | 'mail_failed'> {
  const rows = await db.execute<AuthUserRow>(sql`
    select id::text as id, email, raw_user_meta_data
    from auth.users
    where lower(email) = lower(${email}) and deleted_at is null
    limit 1
  `);
  const user = rows[0];
  if (!user) return 'no_user';

  const tempPassword = generateTempPassword();
  const meta = (user.raw_user_meta_data ?? {}) as Record<string, unknown>;
  const svc = createSupabaseServiceClient();
  const { error } = await svc.auth.admin.updateUserById(user.id, {
    password: tempPassword,
    email_confirm: true,
    user_metadata: { ...meta, must_change_password: true, temp_password_issued_at: new Date().toISOString() },
  });
  if (error) { console.error('[temp-password] updateUserById', error.message); return 'update_failed'; }

  const name = String(meta.full_name ?? meta.name ?? meta.nickname ?? user.email.split('@')[0] ?? '').trim() || user.email;
  const { subject, html } = buildTempPasswordEmail(locale, name, tempPassword);
  const ok = await sendEmail(user.email, subject, html);
  return ok ? 'sent' : 'mail_failed';
}
