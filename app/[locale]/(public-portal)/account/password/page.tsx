import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import PasswordChangeForm, { type PasswordCopy } from './_components/password-change-form';

export const dynamic = 'force-dynamic';

/**
 * 비밀번호 변경 — 임시 비밀번호로 로그인한 회원(user_metadata.must_change_password)이
 * 바로 오는 화면이자, 마이페이지에서 평소에도 쓰는 변경 화면. 로그인 세션이 있어야 하며
 * 새 비밀번호는 supabase.auth.updateUser 로 바꾼다 (lib/auth/temp-password.ts 참고).
 */
const COPY: Record<PublicLocale, PasswordCopy & { title: string; intro: string; tempNotice: string; loginRequired: string; loginCta: string }> = {
  kr: {
    title: '비밀번호 변경', intro: '새 비밀번호를 정해 주세요. 8자 이상이어야 합니다.',
    tempNotice: '임시 비밀번호로 로그인하셨습니다. 계속 쓰려면 새 비밀번호를 정해 주세요.',
    newPassword: '새 비밀번호', confirm: '새 비밀번호 확인', submit: '비밀번호 변경', saving: '변경 중…',
    tooShort: '비밀번호는 8자 이상이어야 합니다.', mismatch: '두 비밀번호가 일치하지 않습니다.',
    same: '이전과 다른 비밀번호를 입력해 주세요.', failed: '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
    done: '비밀번호가 변경되었습니다.', loginRequired: '로그인이 필요합니다.', loginCta: '로그인하기 →',
  },
  en: {
    title: 'Change password', intro: 'Choose a new password of at least 8 characters.',
    tempNotice: 'You signed in with a temporary password. Please set a new password to keep using your account.',
    newPassword: 'New password', confirm: 'Confirm new password', submit: 'Change password', saving: 'Saving…',
    tooShort: 'Password must be at least 8 characters.', mismatch: 'The two passwords do not match.',
    same: 'Please choose a password different from the previous one.', failed: 'We could not change your password. Please try again later.',
    done: 'Your password has been changed.', loginRequired: 'Please sign in first.', loginCta: 'Sign in →',
  },
  ja: {
    title: 'パスワード変更', intro: '新しいパスワードを設定してください（8文字以上）。',
    tempNotice: '仮パスワードでログインしています。引き続きご利用いただくには新しいパスワードを設定してください。',
    newPassword: '新しいパスワード', confirm: '新しいパスワード（確認）', submit: 'パスワードを変更', saving: '変更中…',
    tooShort: 'パスワードは8文字以上にしてください。', mismatch: '2つのパスワードが一致しません。',
    same: '以前と異なるパスワードを入力してください。', failed: 'パスワードを変更できませんでした。しばらくしてからもう一度お試しください。',
    done: 'パスワードを変更しました。', loginRequired: 'ログインが必要です。', loginCta: 'ログイン →',
  },
  zh: {
    title: '修改密码', intro: '请设置新密码（至少 8 位）。',
    tempNotice: '您当前使用临时密码登录。请设置新密码以继续使用账户。',
    newPassword: '新密码', confirm: '确认新密码', submit: '修改密码', saving: '修改中…',
    tooShort: '密码至少需要 8 位。', mismatch: '两次输入的密码不一致。',
    same: '请输入与之前不同的密码。', failed: '无法修改密码，请稍后重试。',
    done: '密码已修改。', loginRequired: '请先登录。', loginCta: '登录 →',
  },
  ru: {
    title: 'Смена пароля', intro: 'Задайте новый пароль — не менее 8 символов.',
    tempNotice: 'Вы вошли с временным паролем. Чтобы продолжить пользоваться аккаунтом, задайте новый пароль.',
    newPassword: 'Новый пароль', confirm: 'Повторите новый пароль', submit: 'Сменить пароль', saving: 'Сохранение…',
    tooShort: 'Пароль должен содержать не менее 8 символов.', mismatch: 'Пароли не совпадают.',
    same: 'Введите пароль, отличающийся от прежнего.', failed: 'Не удалось сменить пароль. Попробуйте позже.',
    done: 'Пароль изменён.', loginRequired: 'Сначала войдите в аккаунт.', loginCta: 'Войти →',
  },
  vi: {
    title: 'Đổi mật khẩu', intro: 'Hãy đặt mật khẩu mới có ít nhất 8 ký tự.',
    tempNotice: 'Bạn đã đăng nhập bằng mật khẩu tạm thời. Hãy đặt mật khẩu mới để tiếp tục sử dụng tài khoản.',
    newPassword: 'Mật khẩu mới', confirm: 'Xác nhận mật khẩu mới', submit: 'Đổi mật khẩu', saving: 'Đang lưu…',
    tooShort: 'Mật khẩu phải có ít nhất 8 ký tự.', mismatch: 'Hai mật khẩu không khớp.',
    same: 'Vui lòng nhập mật khẩu khác với mật khẩu trước.', failed: 'Không đổi được mật khẩu. Vui lòng thử lại sau.',
    done: 'Đã đổi mật khẩu.', loginRequired: 'Vui lòng đăng nhập trước.', loginCta: 'Đăng nhập →',
  },
};

export default async function PasswordChangePage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { next?: string };
}): Promise<JSX.Element> {
  const { locale } = params;
  const c = COPY[locale] ?? COPY.en;
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : `/${locale}/me`;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const mustChange = Boolean((user?.user_metadata as Record<string, unknown> | undefined)?.must_change_password);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px 80px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: '#222' }}>{c.title}</h1>
      {!user ? (
        <>
          <p style={{ color: '#6a6a6a', margin: '0 0 20px', lineHeight: 1.6 }}>{c.loginRequired}</p>
          <Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/password`)}`} style={{ color: '#ff385c', fontWeight: 700, textDecoration: 'none' }}>{c.loginCta}</Link>
        </>
      ) : (
        <>
          {mustChange ? (
            <p style={{ margin: '0 0 14px', padding: '12px 14px', background: '#fff7f8', border: '1px solid #ffd1da', borderRadius: 10, color: '#b3261e', fontSize: 14, lineHeight: 1.5 }}>{c.tempNotice}</p>
          ) : null}
          <p style={{ color: '#6a6a6a', margin: '0 0 20px', lineHeight: 1.6 }}>{c.intro}</p>
          <PasswordChangeForm copy={c} next={next} />
        </>
      )}
    </main>
  );
}
