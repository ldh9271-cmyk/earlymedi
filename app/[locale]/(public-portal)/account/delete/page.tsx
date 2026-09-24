import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import DeleteRequestForm from './_components/delete-request-form';

export const dynamic = 'force-dynamic';

/**
 * 계정 삭제 요청 안내 — Google Play '계정 삭제' 정책의 웹 경로(데이터 보안 양식에 넣는 URL).
 * 앱 이름·운영사·요청 방법·삭제되는 데이터·보관되는 데이터와 기간을 한 화면에 적는다.
 * 보관 기간은 개인정보처리방침 4조와 같게 맞춘다 (바꾸면 둘 다 고칠 것).
 */
type Copy = {
  title: string; intro: string;
  howTitle: string; how: string[];
  emailLine: string;
  deletedTitle: string; deleted: string[];
  keptTitle: string; kept: string[];
  loginCta: string;
  form: { reason: string; confirm: string; submit: string; sending: string; done: string; already: string; failed: string; loginRequired: string };
};

const EMAIL = 'ldh9271@gmail.com';

const COPY: Record<PublicLocale, Copy> = {
  kr: {
    title: '계정 삭제 요청',
    intro: '글로우업투어(GlowUpTour · 운영사 주식회사 쉐어아트) 앱과 웹사이트의 회원 계정과 관련 데이터를 삭제하도록 요청하는 방법입니다.',
    howTitle: '요청 방법',
    how: ['앱 또는 웹사이트에 로그인합니다.', '마이페이지 아래 “계정 삭제 요청”을 누르거나 이 페이지로 옵니다.', '아래 버튼으로 요청을 보내면 30일 이내에 처리하고, 가입한 이메일로 완료를 알려 드립니다.'],
    emailLine: `로그인할 수 없다면 가입 이메일 주소를 적어 ${EMAIL} 로 “계정 삭제 요청” 메일을 보내 주세요.`,
    deletedTitle: '삭제되는 데이터',
    deleted: ['계정 정보 (이메일, 이름, 연락처, 국가, 메신저 ID)', '소셜 로그인 연동 정보 (카카오·라인·왓츠앱 등)', '업로드한 얼굴 사진과 AI 분석·시뮬레이션 결과', '문의 내용과 관심 목록', '사용하지 않은 AI 포인트 (환불되지 않고 소멸)'],
    keptTitle: '법에 따라 보관 후 파기되는 데이터',
    kept: ['결제·예약 기록: 5년 (전자상거래법)', '분쟁 처리 기록: 3년 (전자상거래법)', '외국인환자 유치 관련 자료: 5년 (의료해외진출법)', '접속 로그·IP: 3개월 (통신비밀보호법)'],
    loginCta: '로그인하고 삭제 요청하기 →',
    form: { reason: '삭제 사유 (선택)', confirm: '위 내용을 확인했으며 계정 삭제를 요청합니다.', submit: '계정 삭제 요청 보내기', sending: '보내는 중…', done: '요청이 접수되었습니다. 30일 이내에 처리하고 가입 이메일로 알려 드립니다.', already: '이미 삭제 요청이 접수된 계정입니다. 처리 완료 시 이메일로 알려 드립니다.', failed: '요청을 보내지 못했습니다. 잠시 후 다시 시도하거나 이메일로 요청해 주세요.', loginRequired: '로그인이 필요합니다.' },
  },
  en: {
    title: 'Request account deletion',
    intro: 'How to ask us to delete your GlowUpTour account (app and website, operated by Shareart Co., Ltd.) and the data linked to it.',
    howTitle: 'How to request',
    how: ['Sign in to the app or website.', 'Tap “Request account deletion” at the bottom of My page, or open this page.', 'Send the request with the button below. We process it within 30 days and confirm to your sign-up email.'],
    emailLine: `If you cannot sign in, email ${EMAIL} with the subject “Account deletion request” and your sign-up email address.`,
    deletedTitle: 'Data we delete',
    deleted: ['Account details (email, name, phone, country, messenger ID)', 'Social sign-in links (Kakao, LINE, WhatsApp, etc.)', 'Face photos you uploaded and AI analysis / simulation results', 'Inquiries and saved items', 'Unused AI points (forfeited, not refunded)'],
    keptTitle: 'Data kept for a legal period, then destroyed',
    kept: ['Payment and booking records: 5 years (Korean E-Commerce Act)', 'Dispute records: 3 years (Korean E-Commerce Act)', 'International patient attraction records: 5 years (Medical Overseas Expansion Act)', 'Access logs and IP: 3 months (Protection of Communications Secrets Act)'],
    loginCta: 'Sign in to request deletion →',
    form: { reason: 'Reason (optional)', confirm: 'I have read the above and request deletion of my account.', submit: 'Send deletion request', sending: 'Sending…', done: 'Your request has been received. We will process it within 30 days and confirm by email.', already: 'A deletion request for this account is already in progress. We will email you when it is done.', failed: 'We could not send the request. Please try again later or email us.', loginRequired: 'Please sign in first.' },
  },
  ja: {
    title: 'アカウント削除のリクエスト',
    intro: 'GlowUpTour（運営：株式会社シェアアート）のアプリとウェブサイトの会員アカウントおよび関連データの削除を依頼する方法です。',
    howTitle: '依頼方法',
    how: ['アプリまたはウェブサイトにログインします。', 'マイページ下部の「アカウント削除のリクエスト」を押すか、このページを開きます。', '下のボタンで送信すると30日以内に処理し、登録メールアドレスに完了をお知らせします。'],
    emailLine: `ログインできない場合は、登録メールアドレスを記載のうえ ${EMAIL} へ件名「アカウント削除リクエスト」でご連絡ください。`,
    deletedTitle: '削除されるデータ',
    deleted: ['アカウント情報（メール、氏名、連絡先、国、メッセンジャーID）', 'ソーシャルログイン連携（Kakao・LINE・WhatsAppなど）', 'アップロードした顔写真とAI分析・シミュレーション結果', 'お問い合わせ内容とお気に入り', '未使用のAIポイント（返金されず失効）'],
    keptTitle: '法令により一定期間保管後に破棄されるデータ',
    kept: ['決済・予約記録：5年（電子商取引法）', '紛争処理記録：3年（電子商取引法）', '外国人患者誘致関連資料：5年（医療海外進出法）', 'アクセスログ・IP：3か月（通信秘密保護法）'],
    loginCta: 'ログインして削除をリクエスト →',
    form: { reason: '削除理由（任意）', confirm: '上記を確認し、アカウントの削除をリクエストします。', submit: '削除リクエストを送信', sending: '送信中…', done: 'リクエストを受け付けました。30日以内に処理し、メールでお知らせします。', already: 'このアカウントの削除リクエストはすでに受け付けています。完了時にメールでお知らせします。', failed: '送信できませんでした。しばらくしてから再度お試しいただくか、メールでご依頼ください。', loginRequired: 'ログインが必要です。' },
  },
  zh: {
    title: '申请删除账户',
    intro: '如何申请删除 GlowUpTour（运营方：Shareart 株式会社）应用与网站的会员账户及相关数据。',
    howTitle: '申请方法',
    how: ['登录应用或网站。', '在“我的页面”底部点击“申请删除账户”，或打开本页面。', '点击下方按钮提交申请，我们将在30天内处理，并通过注册邮箱通知您。'],
    emailLine: `如无法登录，请写明注册邮箱，以“账户删除申请”为主题发送邮件至 ${EMAIL}。`,
    deletedTitle: '将被删除的数据',
    deleted: ['账户信息（邮箱、姓名、联系方式、国家、通讯软件ID）', '社交登录绑定（Kakao、LINE、WhatsApp 等）', '上传的面部照片及 AI 分析、模拟结果', '咨询内容与收藏', '未使用的 AI 积分（不予退款，将作废）'],
    keptTitle: '依法保存一定期限后销毁的数据',
    kept: ['支付与预约记录：5年（韩国电子商务法）', '纠纷处理记录：3年（韩国电子商务法）', '外国患者招揽相关资料：5年（韩国医疗海外进出法）', '访问日志与 IP：3个月（韩国通信秘密保护法）'],
    loginCta: '登录后申请删除 →',
    form: { reason: '删除原因（选填）', confirm: '我已阅读以上内容，申请删除我的账户。', submit: '提交删除申请', sending: '提交中…', done: '申请已受理。我们将在30天内处理，并通过邮件通知您。', already: '该账户的删除申请已在处理中，完成后将通过邮件通知您。', failed: '提交失败。请稍后重试，或通过邮件申请。', loginRequired: '请先登录。' },
  },
  ru: {
    title: 'Запрос на удаление аккаунта',
    intro: 'Как запросить удаление аккаунта GlowUpTour (приложение и сайт, оператор — Shareart Co., Ltd.) и связанных с ним данных.',
    howTitle: 'Как отправить запрос',
    how: ['Войдите в приложение или на сайт.', 'Нажмите «Запросить удаление аккаунта» внизу «Моей страницы» или откройте эту страницу.', 'Отправьте запрос кнопкой ниже. Мы обработаем его в течение 30 дней и сообщим на e-mail, указанный при регистрации.'],
    emailLine: `Если войти не получается, напишите на ${EMAIL} с темой «Удаление аккаунта» и укажите e-mail, использованный при регистрации.`,
    deletedTitle: 'Что удаляется',
    deleted: ['Данные аккаунта (e-mail, имя, телефон, страна, ID в мессенджере)', 'Привязки входа через соцсети (Kakao, LINE, WhatsApp и др.)', 'Загруженные фото лица и результаты AI-анализа и симуляций', 'Обращения и избранное', 'Неиспользованные AI-баллы (сгорают, не возвращаются)'],
    keptTitle: 'Что хранится установленный законом срок и затем уничтожается',
    kept: ['Записи об оплате и бронировании: 5 лет (Закон Кореи об электронной торговле)', 'Записи о спорах: 3 года (Закон Кореи об электронной торговле)', 'Материалы по привлечению иностранных пациентов: 5 лет (Закон Кореи о зарубежной медицинской деятельности)', 'Журналы доступа и IP: 3 месяца (Закон Кореи о тайне связи)'],
    loginCta: 'Войти и запросить удаление →',
    form: { reason: 'Причина (необязательно)', confirm: 'Я ознакомился(-ась) с информацией выше и прошу удалить мой аккаунт.', submit: 'Отправить запрос', sending: 'Отправка…', done: 'Запрос принят. Мы обработаем его в течение 30 дней и сообщим по e-mail.', already: 'Запрос на удаление этого аккаунта уже обрабатывается. Мы сообщим по e-mail, когда всё будет готово.', failed: 'Не удалось отправить запрос. Попробуйте позже или напишите нам.', loginRequired: 'Сначала войдите в аккаунт.' },
  },
  vi: {
    title: 'Yêu cầu xóa tài khoản',
    intro: 'Cách yêu cầu xóa tài khoản GlowUpTour (ứng dụng và website, do Shareart Co., Ltd. vận hành) cùng dữ liệu liên quan.',
    howTitle: 'Cách gửi yêu cầu',
    how: ['Đăng nhập vào ứng dụng hoặc website.', 'Nhấn “Yêu cầu xóa tài khoản” ở cuối Trang của tôi, hoặc mở trang này.', 'Gửi yêu cầu bằng nút bên dưới. Chúng tôi xử lý trong vòng 30 ngày và báo lại qua email đăng ký.'],
    emailLine: `Nếu không thể đăng nhập, hãy gửi email tới ${EMAIL} với tiêu đề “Yêu cầu xóa tài khoản” và ghi rõ email đã đăng ký.`,
    deletedTitle: 'Dữ liệu bị xóa',
    deleted: ['Thông tin tài khoản (email, họ tên, số điện thoại, quốc gia, ID nhắn tin)', 'Liên kết đăng nhập mạng xã hội (Kakao, LINE, WhatsApp…)', 'Ảnh khuôn mặt đã tải lên và kết quả phân tích, mô phỏng AI', 'Nội dung hỏi đáp và mục đã lưu', 'Điểm AI chưa dùng (bị hủy, không hoàn tiền)'],
    keptTitle: 'Dữ liệu được lưu theo luật rồi hủy',
    kept: ['Hồ sơ thanh toán và đặt chỗ: 5 năm (Luật Thương mại điện tử Hàn Quốc)', 'Hồ sơ xử lý tranh chấp: 3 năm (Luật Thương mại điện tử Hàn Quốc)', 'Tài liệu thu hút bệnh nhân nước ngoài: 5 năm (Luật Y tế ra nước ngoài Hàn Quốc)', 'Nhật ký truy cập và IP: 3 tháng (Luật Bảo vệ bí mật thông tin liên lạc Hàn Quốc)'],
    loginCta: 'Đăng nhập để yêu cầu xóa →',
    form: { reason: 'Lý do (không bắt buộc)', confirm: 'Tôi đã đọc nội dung trên và yêu cầu xóa tài khoản của mình.', submit: 'Gửi yêu cầu xóa', sending: 'Đang gửi…', done: 'Đã tiếp nhận yêu cầu. Chúng tôi sẽ xử lý trong vòng 30 ngày và báo qua email.', already: 'Tài khoản này đã có yêu cầu xóa đang được xử lý. Chúng tôi sẽ báo qua email khi hoàn tất.', failed: 'Không gửi được yêu cầu. Vui lòng thử lại sau hoặc gửi email cho chúng tôi.', loginRequired: 'Vui lòng đăng nhập trước.' },
  },
};

export async function generateMetadata({ params }: { params: { locale: PublicLocale } }): Promise<{ title: string; description: string }> {
  const c = COPY[params.locale] ?? COPY.en;
  return { title: `${c.title} · GlowUpTour`, description: c.intro };
}

export default async function AccountDeletePage({ params }: { params: { locale: PublicLocale } }): Promise<JSX.Element> {
  const locale = params.locale;
  const c = COPY[locale] ?? COPY.en;
  let signedIn = false; let requestedAt: string | null = null; let email: string | null = null;
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    if (data.user) {
      signedIn = true; email = data.user.email ?? null;
      const v = (data.user.user_metadata ?? {}).deletion_requested_at;
      requestedAt = typeof v === 'string' ? v : null;
    }
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
          <DeleteRequestForm locale={locale} email={email} requestedAt={requestedAt} t={c.form} />
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
