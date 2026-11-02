import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import DeleteAccountForm, { type DeleteFormCopy } from './_components/delete-account-form';

export const dynamic = 'force-dynamic';

/**
 * 계정 삭제 — 회원이 직접 즉시 삭제 (App Store 5.1.1(v) · Google Play 계정 삭제 정책의 웹 경로).
 * 2026-11-03 애플 심사 거절(삭제 '요청'만 있고 앱 안에서 삭제를 시작할 수 없음)로 요청 폼 → 즉시 삭제로 전환.
 * 앱 이름·운영사·방법·삭제되는 데이터·보관되는 데이터와 기간을 한 화면에 적는다.
 * 보관 기간은 개인정보처리방침 4조와 같게 맞춘다 (바꾸면 둘 다 고칠 것). 삭제 로직은 ./actions.ts.
 */
type Copy = {
  title: string; intro: string;
  howTitle: string; how: string[];
  emailLine: string;
  deletedTitle: string; deleted: string[];
  keptTitle: string; kept: string[];
  loginCta: string;
  form: DeleteFormCopy;
};

const EMAIL = 'ldh9271@gmail.com';

const COPY: Record<PublicLocale, Copy> = {
  kr: {
    title: '계정 삭제',
    intro: '글로우업투어(GlowUpTour · 운영사 주식회사 쉐어아트) 앱과 웹사이트의 회원 계정과 관련 데이터를 직접 삭제하는 방법입니다. 삭제는 즉시 처리되며 되돌릴 수 없습니다.',
    howTitle: '삭제 방법',
    how: ['앱 또는 웹사이트에 로그인합니다.', '오른쪽 위 계정 메뉴 또는 마이페이지의 “계정 삭제”를 누르거나 이 페이지로 옵니다.', '아래 내용을 확인하고 “계정 영구 삭제”를 누르면 확인 창 뒤 즉시 삭제되고 자동으로 로그아웃됩니다.'],
    emailLine: `로그인할 수 없다면 가입 이메일 주소를 적어 ${EMAIL} 로 “계정 삭제 요청” 메일을 보내 주세요. 30일 이내에 처리합니다.`,
    deletedTitle: '즉시 삭제되는 데이터',
    deleted: ['계정 정보 (이메일, 비밀번호, 이름, 연락처, 국가, 메신저 ID)', '소셜 로그인 연동 정보 (Apple·카카오·라인·구글 등)', 'AI 얼굴 분석 결과·AI 여행 플랜 (사진 자체는 애초에 저장하지 않습니다)', '상담 채팅방과 문의 내용, 앱 푸시 알림 등록', '추천 코드 귀속 정보와 사용하지 않은 AI 포인트 (환불되지 않고 소멸)'],
    keptTitle: '법에 따라 보관 후 파기되는 데이터',
    kept: ['결제·예약 기록: 5년 (전자상거래법)', '분쟁 처리 기록: 3년 (전자상거래법)', '외국인환자 유치 관련 자료: 5년 (의료해외진출법)', '접속 로그·IP: 3개월 (통신비밀보호법)'],
    loginCta: '로그인하고 계정 삭제하기 →',
    form: { confirm: '위 내용을 확인했으며, 내 계정과 데이터를 영구 삭제하는 데 동의합니다.', submit: '계정 영구 삭제', deleting: '삭제 중…', dialog: '정말 계정을 삭제할까요? 삭제 후에는 복구할 수 없습니다.', done: '계정이 삭제되었습니다. 이용해 주셔서 감사합니다.', doneHint: '법령에 따라 보관하는 결제·예약 기록을 제외한 개인정보가 삭제되었고, 자동으로 로그아웃되었습니다.', home: '홈으로', failed: '삭제하지 못했습니다. 잠시 후 다시 시도하거나 이메일로 요청해 주세요.', loginRequired: '로그인이 필요합니다.', activeBookings: '결제·확정된 예약이 남아 있어 지금은 삭제할 수 없습니다. 마이페이지에서 예약을 취소하거나 이용을 마친 뒤 다시 시도해 주세요.', goBookings: '마이페이지에서 예약 보기 →', businessAccount: `이 계정은 사업자 콘솔(의료기관·파트너) 조직에 속해 있어 직접 삭제할 수 없습니다. 조직에서 탈퇴한 뒤 다시 시도하거나 ${EMAIL} 로 요청해 주세요.` },
  },
  en: {
    title: 'Delete account',
    intro: 'How to delete your GlowUpTour account (app and website, operated by Shareart Co., Ltd.) and the data linked to it yourself. Deletion is immediate and cannot be undone.',
    howTitle: 'How to delete',
    how: ['Sign in to the app or website.', 'Open the account menu at the top right or My page and tap “Delete account”, or open this page.', 'Read the notes below and tap “Delete account permanently”. After a confirmation dialog, the account is deleted immediately and you are signed out.'],
    emailLine: `If you cannot sign in, email ${EMAIL} with the subject “Account deletion request” and your sign-up email address. We process it within 30 days.`,
    deletedTitle: 'Data deleted immediately',
    deleted: ['Account details (email, password, name, phone, country, messenger ID)', 'Social sign-in links (Apple, Kakao, LINE, Google, etc.)', 'AI face-analysis results and AI trip plans (photos themselves are never stored)', 'Chat rooms, inquiries and app push-notification registrations', 'Referral attribution and unused AI points (forfeited, not refunded)'],
    keptTitle: 'Data kept for a legal period, then destroyed',
    kept: ['Payment and booking records: 5 years (Korean E-Commerce Act)', 'Dispute records: 3 years (Korean E-Commerce Act)', 'International patient attraction records: 5 years (Medical Overseas Expansion Act)', 'Access logs and IP: 3 months (Protection of Communications Secrets Act)'],
    loginCta: 'Sign in to delete your account →',
    form: { confirm: 'I have read the above and agree to permanently delete my account and data.', submit: 'Delete account permanently', deleting: 'Deleting…', dialog: 'Delete your account? This cannot be undone.', done: 'Your account has been deleted. Thank you for using GlowUpTour.', doneHint: 'Your personal data has been deleted, except payment and booking records kept as required by law. You have been signed out.', home: 'Go to home', failed: 'We could not delete the account. Please try again later or email us.', loginRequired: 'Please sign in first.', activeBookings: 'You still have a paid or confirmed booking, so the account cannot be deleted yet. Cancel it or complete the visit on My page, then try again.', goBookings: 'View bookings on My page →', businessAccount: `This account belongs to a business console organization (clinic or partner) and cannot delete itself. Leave the organization first, or email ${EMAIL}.` },
  },
  ja: {
    title: 'アカウント削除',
    intro: 'GlowUpTour（運営：株式会社シェアアート）のアプリとウェブサイトの会員アカウントと関連データをご自身で削除する方法です。削除は即時に行われ、元に戻せません。',
    howTitle: '削除方法',
    how: ['アプリまたはウェブサイトにログインします。', '右上のアカウントメニューまたはマイページの「アカウント削除」を押すか、このページを開きます。', '下記を確認し「アカウントを完全に削除」を押すと、確認ダイアログの後すぐに削除され、自動でログアウトされます。'],
    emailLine: `ログインできない場合は、登録メールアドレスを記載のうえ ${EMAIL} へ件名「アカウント削除リクエスト」でご連絡ください。30日以内に処理します。`,
    deletedTitle: 'すぐに削除されるデータ',
    deleted: ['アカウント情報（メール、パスワード、氏名、連絡先、国、メッセンジャーID）', 'ソーシャルログイン連携（Apple・Kakao・LINE・Google など）', 'AI顔分析の結果とAI旅行プラン（写真そのものは最初から保存しません）', '相談チャットルーム、お問い合わせ内容、アプリのプッシュ通知登録', '紹介コードの紐付けと未使用のAIポイント（返金されず失効）'],
    keptTitle: '法令により一定期間保管後に破棄されるデータ',
    kept: ['決済・予約記録：5年（電子商取引法）', '紛争処理記録：3年（電子商取引法）', '外国人患者誘致関連資料：5年（医療海外進出法）', 'アクセスログ・IP：3か月（通信秘密保護法）'],
    loginCta: 'ログインしてアカウントを削除 →',
    form: { confirm: '上記を確認し、アカウントとデータの完全削除に同意します。', submit: 'アカウントを完全に削除', deleting: '削除中…', dialog: '本当にアカウントを削除しますか？削除後は復元できません。', done: 'アカウントを削除しました。ご利用ありがとうございました。', doneHint: '法令により保管する決済・予約記録を除く個人情報を削除し、自動でログアウトしました。', home: 'ホームへ', failed: '削除できませんでした。しばらくしてから再度お試しいただくか、メールでご依頼ください。', loginRequired: 'ログインが必要です。', activeBookings: '決済済み・確定済みの予約が残っているため、今は削除できません。マイページで予約をキャンセルするか、利用を終えてから再度お試しください。', goBookings: 'マイページで予約を見る →', businessAccount: `このアカウントは事業者コンソール（医療機関・パートナー）の組織に所属しているため、ご自身では削除できません。組織から退会してから再度お試しいただくか、${EMAIL} へご依頼ください。` },
  },
  zh: {
    title: '删除账户',
    intro: '如何自行删除 GlowUpTour（运营方：Shareart 株式会社）应用与网站的会员账户及相关数据。删除会立即生效，且无法撤销。',
    howTitle: '删除方法',
    how: ['登录应用或网站。', '点击右上角账户菜单或“我的页面”中的“删除账户”，或打开本页面。', '确认以下内容后点击“永久删除账户”，经确认弹窗后立即删除，并自动退出登录。'],
    emailLine: `如无法登录，请写明注册邮箱，以“账户删除申请”为主题发送邮件至 ${EMAIL}，我们将在30天内处理。`,
    deletedTitle: '立即删除的数据',
    deleted: ['账户信息（邮箱、密码、姓名、联系方式、国家、通讯软件ID）', '社交登录绑定（Apple、Kakao、LINE、Google 等）', 'AI 面部分析结果与 AI 行程方案（照片本身从不保存）', '咨询聊天室、咨询内容及应用推送通知注册', '推荐码归属信息与未使用的 AI 积分（不予退款，将作废）'],
    keptTitle: '依法保存一定期限后销毁的数据',
    kept: ['支付与预约记录：5年（韩国电子商务法）', '纠纷处理记录：3年（韩国电子商务法）', '外国患者招揽相关资料：5年（韩国医疗海外进出法）', '访问日志与 IP：3个月（韩国通信秘密保护法）'],
    loginCta: '登录后删除账户 →',
    form: { confirm: '我已阅读以上内容，同意永久删除我的账户及数据。', submit: '永久删除账户', deleting: '删除中…', dialog: '确定要删除账户吗？删除后无法恢复。', done: '账户已删除。感谢您的使用。', doneHint: '除依法保存的支付与预约记录外，您的个人信息已删除，并已自动退出登录。', home: '返回首页', failed: '删除失败。请稍后重试，或通过邮件申请。', loginRequired: '请先登录。', activeBookings: '您仍有已支付或已确认的预约，目前无法删除。请在“我的页面”取消预约或完成使用后再试。', goBookings: '在“我的页面”查看预约 →', businessAccount: `该账户属于商家控制台（医疗机构·合作伙伴）组织，无法自行删除。请先退出组织后再试，或发送邮件至 ${EMAIL}。` },
  },
  ru: {
    title: 'Удаление аккаунта',
    intro: 'Как самостоятельно удалить аккаунт GlowUpTour (приложение и сайт, оператор — Shareart Co., Ltd.) и связанные с ним данные. Удаление выполняется сразу и необратимо.',
    howTitle: 'Как удалить',
    how: ['Войдите в приложение или на сайт.', 'Откройте меню аккаунта справа вверху или «Мою страницу» и нажмите «Удалить аккаунт», либо откройте эту страницу.', 'Ознакомьтесь с информацией ниже и нажмите «Удалить аккаунт навсегда». После подтверждения аккаунт удаляется сразу, и вы выходите из системы.'],
    emailLine: `Если войти не получается, напишите на ${EMAIL} с темой «Удаление аккаунта» и укажите e-mail, использованный при регистрации. Мы обработаем запрос в течение 30 дней.`,
    deletedTitle: 'Что удаляется сразу',
    deleted: ['Данные аккаунта (e-mail, пароль, имя, телефон, страна, ID в мессенджере)', 'Привязки входа через соцсети (Apple, Kakao, LINE, Google и др.)', 'Результаты AI-анализа лица и AI-планы поездок (сами фото никогда не сохраняются)', 'Чаты, обращения и регистрации push-уведомлений приложения', 'Привязка реферального кода и неиспользованные AI-баллы (сгорают, не возвращаются)'],
    keptTitle: 'Что хранится установленный законом срок и затем уничтожается',
    kept: ['Записи об оплате и бронировании: 5 лет (Закон Кореи об электронной торговле)', 'Записи о спорах: 3 года (Закон Кореи об электронной торговле)', 'Материалы по привлечению иностранных пациентов: 5 лет (Закон Кореи о зарубежной медицинской деятельности)', 'Журналы доступа и IP: 3 месяца (Закон Кореи о тайне связи)'],
    loginCta: 'Войти и удалить аккаунт →',
    form: { confirm: 'Я ознакомился(-ась) с информацией выше и согласен(-на) навсегда удалить свой аккаунт и данные.', submit: 'Удалить аккаунт навсегда', deleting: 'Удаление…', dialog: 'Удалить аккаунт? Это действие нельзя отменить.', done: 'Аккаунт удалён. Спасибо, что пользовались GlowUpTour.', doneHint: 'Персональные данные удалены, кроме записей об оплате и бронировании, которые хранятся по закону. Вы вышли из системы.', home: 'На главную', failed: 'Не удалось удалить аккаунт. Попробуйте позже или напишите нам.', loginRequired: 'Сначала войдите в аккаунт.', activeBookings: 'У вас есть оплаченное или подтверждённое бронирование, поэтому аккаунт пока нельзя удалить. Отмените его или завершите визит на «Моей странице» и попробуйте снова.', goBookings: 'Бронирования на «Моей странице» →', businessAccount: `Этот аккаунт входит в организацию бизнес-консоли (клиника или партнёр), поэтому его нельзя удалить самостоятельно. Сначала выйдите из организации или напишите на ${EMAIL}.` },
  },
  vi: {
    title: 'Xóa tài khoản',
    intro: 'Cách tự xóa tài khoản GlowUpTour (ứng dụng và website, do Shareart Co., Ltd. vận hành) cùng dữ liệu liên quan. Việc xóa có hiệu lực ngay và không thể hoàn tác.',
    howTitle: 'Cách xóa',
    how: ['Đăng nhập vào ứng dụng hoặc website.', 'Mở menu tài khoản ở góc trên bên phải hoặc Trang của tôi và nhấn “Xóa tài khoản”, hoặc mở trang này.', 'Đọc nội dung bên dưới và nhấn “Xóa tài khoản vĩnh viễn”. Sau hộp thoại xác nhận, tài khoản bị xóa ngay và bạn được đăng xuất.'],
    emailLine: `Nếu không thể đăng nhập, hãy gửi email tới ${EMAIL} với tiêu đề “Yêu cầu xóa tài khoản” và ghi rõ email đã đăng ký. Chúng tôi xử lý trong vòng 30 ngày.`,
    deletedTitle: 'Dữ liệu bị xóa ngay',
    deleted: ['Thông tin tài khoản (email, mật khẩu, họ tên, số điện thoại, quốc gia, ID nhắn tin)', 'Liên kết đăng nhập mạng xã hội (Apple, Kakao, LINE, Google…)', 'Kết quả phân tích khuôn mặt AI và kế hoạch chuyến đi AI (ảnh gốc không bao giờ được lưu)', 'Phòng chat tư vấn, nội dung hỏi đáp và đăng ký thông báo đẩy của ứng dụng', 'Liên kết mã giới thiệu và điểm AI chưa dùng (bị hủy, không hoàn tiền)'],
    keptTitle: 'Dữ liệu được lưu theo luật rồi hủy',
    kept: ['Hồ sơ thanh toán và đặt chỗ: 5 năm (Luật Thương mại điện tử Hàn Quốc)', 'Hồ sơ xử lý tranh chấp: 3 năm (Luật Thương mại điện tử Hàn Quốc)', 'Tài liệu thu hút bệnh nhân nước ngoài: 5 năm (Luật Y tế ra nước ngoài Hàn Quốc)', 'Nhật ký truy cập và IP: 3 tháng (Luật Bảo vệ bí mật thông tin liên lạc Hàn Quốc)'],
    loginCta: 'Đăng nhập để xóa tài khoản →',
    form: { confirm: 'Tôi đã đọc nội dung trên và đồng ý xóa vĩnh viễn tài khoản cùng dữ liệu của mình.', submit: 'Xóa tài khoản vĩnh viễn', deleting: 'Đang xóa…', dialog: 'Bạn có chắc muốn xóa tài khoản? Không thể khôi phục sau khi xóa.', done: 'Tài khoản đã được xóa. Cảm ơn bạn đã sử dụng GlowUpTour.', doneHint: 'Thông tin cá nhân của bạn đã được xóa, trừ hồ sơ thanh toán và đặt chỗ lưu theo luật. Bạn đã được đăng xuất.', home: 'Về trang chủ', failed: 'Không xóa được tài khoản. Vui lòng thử lại sau hoặc gửi email cho chúng tôi.', loginRequired: 'Vui lòng đăng nhập trước.', activeBookings: 'Bạn vẫn còn đặt chỗ đã thanh toán hoặc đã xác nhận nên chưa thể xóa tài khoản. Hãy hủy hoặc hoàn tất lượt sử dụng tại Trang của tôi rồi thử lại.', goBookings: 'Xem đặt chỗ tại Trang của tôi →', businessAccount: `Tài khoản này thuộc một tổ chức trong bảng điều khiển doanh nghiệp (phòng khám hoặc đối tác) nên không thể tự xóa. Hãy rời tổ chức trước rồi thử lại, hoặc gửi email tới ${EMAIL}.` },
  },
};

export async function generateMetadata({ params }: { params: { locale: PublicLocale } }): Promise<{ title: string; description: string }> {
  const c = COPY[params.locale] ?? COPY.en;
  return { title: `${c.title} · GlowUpTour`, description: c.intro };
}

export default async function AccountDeletePage({ params }: { params: { locale: PublicLocale } }): Promise<JSX.Element> {
  const locale = params.locale;
  const c = COPY[locale] ?? COPY.en;
  let signedIn = false; let email: string | null = null;
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    if (data.user) { signedIn = true; email = data.user.email ?? null; }
  } catch { /* 비로그인 취급 */ }

  const h2: React.CSSProperties = { fontSize: 17, fontWeight: 700, margin: '28px 0 8px' };
  const li: React.CSSProperties = { fontSize: 14, color: '#3f3f3f', lineHeight: 1.7 };

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px', color: '#222' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{c.title}</h1>
      <p style={{ fontSize: 15, color: '#3f3f3f', lineHeight: 1.65, margin: '10px 0 0' }}>{c.intro}</p>

      <h2 style={h2}>{c.howTitle}</h2>
      <ol style={{ margin: 0, paddingLeft: 20 }}>{c.how.map((x) => <li key={x} style={li}>{x}</li>)}</ol>
      <p style={{ fontSize: 13, color: '#6a6a6a', lineHeight: 1.6, margin: '8px 0 0' }}>{c.emailLine}</p>

      <div style={{ marginTop: 20, border: '1px solid #ebebeb', borderRadius: 14, padding: 20, background: '#fafafa' }}>
        {signedIn ? (
          <DeleteAccountForm locale={locale} email={email} t={c.form} />
        ) : (
          <Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/delete`)}`} style={{ display: 'inline-block', background: '#222', color: '#fff', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            {c.loginCta}
          </Link>
        )}
      </div>

      <h2 style={h2}>{c.deletedTitle}</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{c.deleted.map((x) => <li key={x} style={li}>{x}</li>)}</ul>

      <h2 style={h2}>{c.keptTitle}</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{c.kept.map((x) => <li key={x} style={li}>{x}</li>)}</ul>

      <p style={{ fontSize: 12, color: '#9c9c9c', marginTop: 28 }}>
        <Link href={`/${locale}/privacy`} style={{ color: '#1d4ed8' }}>Privacy Policy →</Link>
      </p>
    </article>
  );
}
