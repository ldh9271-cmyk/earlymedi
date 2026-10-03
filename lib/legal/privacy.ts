import type { LegalDocs } from './types';

/**
 * 개인정보처리방침 — 한국어 원문 + 5개 언어 번역 (2026-10-03). 조항을 고치면 6개 언어를 함께 고친다.
 * 보관 기간(4조)은 /[locale]/account/delete 안내와 같게 유지한다.
 */
export const PRIVACY: LegalDocs = {
  kr: {
    metaTitle: '개인정보처리방침 · 글로우업투어',
    title: '개인정보처리방침',
    effective: '시행일: 2026년 1월 1일 · 최근 개정: 2026년 9월 17일',
    backToSignup: '가입으로 돌아가기',
    sections: [
      { title: '1. 총칙', lead: '주식회사 쉐어아트(이하 “회사”)는 「개인정보 보호법」 및 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 처리하기 위해 본 방침을 수립 · 공개합니다.' },
      { title: '2. 수집하는 개인정보 항목', items: [
        { term: '가입 시 (필수):', text: '이메일, 비밀번호(암호화 저장), 이름, 국가, 전화번호' },
        { term: '가입 시 (선택):', text: '메신저 종류 및 ID(KakaoTalk / WhatsApp / LINE / WeChat 등)' },
        { term: '문의 · 예약 시:', text: '관심 시술 카테고리, 희망 일정, 자유 입력 메모, 첨부 이미지(선택)' },
        { term: '자동 수집:', text: '접속 IP, 브라우저 정보, 쿠키, 서비스 이용 기록, 페이지 진입 시각' },
        { term: '결제 시 (해당 시):', text: '결제 수단(카드 마스킹), 결제 금액, 결제 통화 — 카드 원번호는 PG사가 직접 처리하며 회사는 저장하지 않습니다.' },
      ] },
      { title: '3. 개인정보의 수집 · 이용 목적', ordered: true, items: [
        '회원 가입 및 본인 확인',
        '서비스 제공(상품 추천, 예약 중개, 통역 컨시어지, 결제 처리)',
        '의료기관 · 파트너업체와의 예약 · 진료 · 후속 케어 매개',
        '고객 문의 응대, 분쟁 조정, 검수 및 부정 이용 방지',
        '법령상 의무 이행(KOIHA 외국인환자 유치 통계 보고 등)',
      ] },
      { title: '4. 개인정보의 보유 · 이용 기간', items: [
        '회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 내 파기)',
        '결제 기록: 「전자상거래법」에 따라 5년 보관',
        '접속 로그 · IP: 「통신비밀보호법」에 따라 3개월 보관',
        '외국인환자 유치 관련 자료: 「의료해외진출법」에 따라 5년 보관',
        '분쟁 처리 기록: 「전자상거래법」에 따라 3년 보관',
      ] },
      { title: '5. 개인정보의 제3자 제공', ordered: true, items: [
        '회사는 원칙적으로 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.',
        { text: '예외적으로 다음의 경우 필요한 최소한의 정보를 제공합니다.', sub: [
          '예약을 신청한 의료기관 · 파트너업체: 이름, 국가, 연락 수단, 시술/상품 정보, 희망 일정',
          '법령에 따른 수사기관 · 보건복지부 등의 정당한 요청',
        ] },
      ] },
      { title: '6. 개인정보 처리의 위탁', lead: '회사는 서비스 운영을 위해 다음 업무를 외부에 위탁할 수 있으며, 위탁 시 「개인정보 보호법」에 따라 안전한 관리를 위한 계약을 체결합니다.', items: [
        '클라우드 인프라: Vercel Inc., Supabase Inc.',
        'AI 번역 · 분석: Google Cloud(Gemini), OpenAI',
        '메신저 채널 연동: Kakao, LINE, Meta, Naver, WeChat',
        '결제 처리: 국내외 PG사(예약 확정 단계에서 명시)',
      ] },
      { title: '7. 이용자의 권리와 행사 방법', ordered: true, items: [
        '이용자는 언제든지 본인의 개인정보를 조회 · 수정 · 삭제 · 처리정지를 요청할 수 있습니다.',
        '회원 탈퇴는 계정 설정 페이지에서 직접 진행하거나 아래 보호 책임자 연락처로 요청하실 수 있습니다.',
        '법정대리인을 통한 14세 미만 아동의 정보 처리는 별도 동의를 받습니다(현재 만 14세 이상만 가입 가능).',
      ] },
      { title: '8. 쿠키의 사용', lead: '회사는 서비스 이용 편의성 향상을 위해 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 일부 기능(자동 로그인, 언어 설정 등)이 제한될 수 있습니다.' },
      { title: '9. 개인정보의 안전성 확보 조치', items: [
        '비밀번호 단방향 암호화 저장',
        '저장 데이터 및 전송 구간 암호화(TLS 1.2 이상)',
        '접근 권한 최소화 및 접근 로그 모니터링',
        '주기적 보안 점검 및 침해 대응 절차 운영',
      ] },
      { title: '10. 개인정보 보호 책임자', items: [
        '이름: 이동희 (주식회사 쉐어아트 개인정보 보호 책임자)',
        '이메일: ldh9271@gmail.com',
        '운영 시간: 평일 09:00 – 18:00 (KST)',
      ] },
      { title: '11. 개정 이력', lead: '본 방침은 법령 또는 서비스 정책 변경에 따라 개정될 수 있으며, 변경 시 시행일 7일 전 서비스 내 공지 또는 가입 이메일로 통지합니다.' },
    ],
    addendum: '부칙: 본 방침은 2026년 1월 1일부터 시행합니다.',
  },

  en: {
    metaTitle: 'Privacy Policy · GlowUpTour',
    title: 'Privacy Policy',
    effective: 'Effective: January 1, 2026 · Last revised: September 17, 2026',
    translationNotice: 'This is a translation for your convenience. If there is any discrepancy, the Korean original prevails.',
    backToSignup: 'Back to sign-up',
    sections: [
      { title: '1. General', lead: 'Shareart Co., Ltd. (the “Company”) complies with the Personal Information Protection Act, the Act on Support for Overseas Expansion of Healthcare Industry and Attraction of International Patients, and other applicable laws, and publishes this Policy to handle users’ personal data safely.' },
      { title: '2. Personal data we collect', items: [
        { term: 'At sign-up (required):', text: 'email, password (stored encrypted), name, country, phone number' },
        { term: 'At sign-up (optional):', text: 'messenger type and ID (KakaoTalk / WhatsApp / LINE / WeChat, etc.)' },
        { term: 'Inquiries and bookings:', text: 'treatment categories of interest, preferred dates, free-text notes, attached images (optional)' },
        { term: 'Collected automatically:', text: 'IP address, browser information, cookies, service usage records, page access times' },
        { term: 'Payments (where applicable):', text: 'payment method (masked card), amount, currency — full card numbers are processed by the payment provider and are not stored by the Company.' },
      ] },
      { title: '3. Purposes of collection and use', ordered: true, items: [
        'Membership registration and identity verification',
        'Providing the service (product recommendations, booking intermediation, interpretation concierge, payment processing)',
        'Mediating bookings, consultations and follow-up care with medical institutions and partners',
        'Handling customer inquiries, mediating disputes, review and prevention of misuse',
        'Fulfilling legal obligations (e.g., KOIHA statistics on international patient attraction)',
      ] },
      { title: '4. Retention and use period', items: [
        'Member information: until account deletion (destroyed within 30 days of deletion)',
        'Payment records: 5 years under the Act on Consumer Protection in Electronic Commerce',
        'Access logs and IP: 3 months under the Protection of Communications Secrets Act',
        'International patient attraction records: 5 years under the Medical Overseas Expansion Act',
        'Dispute records: 3 years under the Act on Consumer Protection in Electronic Commerce',
      ] },
      { title: '5. Provision to third parties', ordered: true, items: [
        'In principle, the Company does not provide personal data to outside parties without the user’s consent.',
        { text: 'As an exception, the minimum necessary information is provided in the following cases:', sub: [
          'The medical institution or partner you requested a booking with: name, country, contact method, treatment/product information, preferred dates',
          'Lawful requests from investigative agencies, the Ministry of Health and Welfare, etc. under applicable law',
        ] },
      ] },
      { title: '6. Outsourcing of processing', lead: 'The Company may outsource the following tasks to operate the service, and concludes contracts for safe management under the Personal Information Protection Act when doing so.', items: [
        'Cloud infrastructure: Vercel Inc., Supabase Inc.',
        'AI translation and analysis: Google Cloud (Gemini), OpenAI',
        'Messenger channel integration: Kakao, LINE, Meta, Naver, WeChat',
        'Payment processing: domestic and international payment providers (stated at booking confirmation)',
      ] },
      { title: '7. Your rights and how to exercise them', ordered: true, items: [
        'You may at any time request to access, correct, delete or suspend the processing of your personal data.',
        'You can delete your account from the account settings page or by contacting the privacy officer below.',
        'Processing of data of children under 14 requires separate consent from a legal guardian (currently only users aged 14 or older may sign up).',
      ] },
      { title: '8. Use of cookies', lead: 'The Company uses cookies to improve convenience. You may refuse cookies in your browser settings, but some features (automatic sign-in, language settings, etc.) may be limited.' },
      { title: '9. Security measures', items: [
        'One-way encrypted storage of passwords',
        'Encryption of stored data and data in transit (TLS 1.2 or higher)',
        'Least-privilege access and access-log monitoring',
        'Regular security checks and incident response procedures',
      ] },
      { title: '10. Privacy officer', items: [
        'Name: Donghee Lee (Privacy Officer, Shareart Co., Ltd.)',
        'Email: ldh9271@gmail.com',
        'Hours: weekdays 09:00–18:00 (KST)',
      ] },
      { title: '11. Revision history', lead: 'This Policy may be revised in line with changes in law or service policy. Changes are announced within the service or by email to your sign-up address at least 7 days before they take effect.' },
    ],
    addendum: 'Addendum: This Policy takes effect on January 1, 2026.',
  },

  ja: {
    metaTitle: 'プライバシーポリシー · GlowUpTour',
    title: 'プライバシーポリシー',
    effective: '施行日：2026年1月1日 · 最終改定：2026年9月17日',
    translationNotice: 'このページは参考訳です。内容に相違がある場合は韓国語の原文が優先されます。',
    backToSignup: '会員登録に戻る',
    sections: [
      { title: '1. 総則', lead: '株式会社シェアアート（以下「当社」）は、「個人情報保護法」および「医療海外進出および外国人患者誘致支援に関する法律」などの関連法令を遵守し、利用者の個人情報を安全に取り扱うために本方針を定め、公開します。' },
      { title: '2. 収集する個人情報の項目', items: [
        { term: '登録時（必須）：', text: 'メールアドレス、パスワード（暗号化して保存）、氏名、国、電話番号' },
        { term: '登録時（任意）：', text: 'メッセンジャーの種類とID（KakaoTalk / WhatsApp / LINE / WeChat など）' },
        { term: 'お問い合わせ・予約時：', text: '関心のある施術カテゴリ、希望日程、自由記入メモ、添付画像（任意）' },
        { term: '自動収集：', text: '接続IP、ブラウザ情報、Cookie、サービス利用記録、ページ閲覧時刻' },
        { term: '決済時（該当する場合）：', text: '決済手段（カード番号はマスキング）、決済金額、決済通貨。カード番号そのものは決済代行会社が直接処理し、当社は保存しません。' },
      ] },
      { title: '3. 個人情報の収集・利用目的', ordered: true, items: [
        '会員登録および本人確認',
        'サービス提供（商品のおすすめ、予約仲介、通訳コンシェルジュ、決済処理）',
        '医療機関・パートナーとの予約・診療・アフターケアの仲介',
        'お問い合わせ対応、紛争調整、審査および不正利用の防止',
        '法令上の義務の履行（KOIHA 外国人患者誘致統計の報告など）',
      ] },
      { title: '4. 個人情報の保有・利用期間', items: [
        '会員情報：退会時まで（退会後30日以内に破棄）',
        '決済記録：「電子商取引法」に基づき5年間保管',
        'アクセスログ・IP：「通信秘密保護法」に基づき3か月保管',
        '外国人患者誘致関連資料：「医療海外進出法」に基づき5年間保管',
        '紛争処理記録：「電子商取引法」に基づき3年間保管',
      ] },
      { title: '5. 個人情報の第三者提供', ordered: true, items: [
        '当社は原則として、利用者の同意なく個人情報を外部に提供しません。',
        { text: '例外として、次の場合に必要最小限の情報を提供します。', sub: [
          '予約を申し込んだ医療機関・パートナー：氏名、国、連絡手段、施術／商品情報、希望日程',
          '法令に基づく捜査機関・保健福祉部などからの正当な要請',
        ] },
      ] },
      { title: '6. 個人情報処理の委託', lead: '当社はサービス運営のため次の業務を外部に委託することがあり、委託時は「個人情報保護法」に基づき安全な管理のための契約を締結します。', items: [
        'クラウドインフラ：Vercel Inc.、Supabase Inc.',
        'AI翻訳・分析：Google Cloud（Gemini）、OpenAI',
        'メッセンジャー連携：Kakao、LINE、Meta、Naver、WeChat',
        '決済処理：国内外の決済代行会社（予約確定の段階で明示）',
      ] },
      { title: '7. 利用者の権利と行使方法', ordered: true, items: [
        '利用者はいつでも自身の個人情報の閲覧・訂正・削除・処理停止を請求できます。',
        '退会はアカウント設定ページから直接行うか、下記の保護責任者の連絡先に請求できます。',
        '14歳未満の児童の情報処理は法定代理人の別途の同意を得ます（現在は満14歳以上のみ登録可能）。',
      ] },
      { title: '8. Cookieの使用', lead: '当社はサービス利用の利便性向上のためCookieを使用します。利用者はブラウザ設定でCookieの保存を拒否できますが、一部の機能（自動ログイン、言語設定など）が制限されることがあります。' },
      { title: '9. 個人情報の安全性確保措置', items: [
        'パスワードの一方向暗号化保存',
        '保存データおよび通信区間の暗号化（TLS 1.2以上）',
        'アクセス権限の最小化とアクセスログの監視',
        '定期的なセキュリティ点検と侵害対応手順の運用',
      ] },
      { title: '10. 個人情報保護責任者', items: [
        '氏名：イ・ドンヒ（株式会社シェアアート 個人情報保護責任者）',
        'メール：ldh9271@gmail.com',
        '対応時間：平日 09:00〜18:00（KST）',
      ] },
      { title: '11. 改定履歴', lead: '本方針は法令またはサービス方針の変更に伴い改定されることがあり、変更時は施行日の7日前にサービス内の告知または登録メールアドレスへの通知で知らせます。' },
    ],
    addendum: '附則：本方針は2026年1月1日から施行します。',
  },

  zh: {
    metaTitle: '隐私政策 · GlowUpTour',
    title: '隐私政策',
    effective: '生效日期：2026年1月1日 · 最近修订：2026年9月17日',
    translationNotice: '本页面为参考译文。如内容存在差异，以韩文原文为准。',
    backToSignup: '返回注册',
    sections: [
      { title: '1. 总则', lead: 'Shareart 株式会社（以下简称“公司”）遵守《个人信息保护法》《医疗海外进出及外国患者招揽支援法》等相关法律，为安全处理用户个人信息而制定并公开本政策。' },
      { title: '2. 收集的个人信息项目', items: [
        { term: '注册时（必填）：', text: '邮箱、密码（加密存储）、姓名、国家、电话号码' },
        { term: '注册时（选填）：', text: '通讯软件种类及 ID（KakaoTalk / WhatsApp / LINE / WeChat 等）' },
        { term: '咨询·预约时：', text: '感兴趣的项目类别、期望日程、自由填写的备注、附件图片（选填）' },
        { term: '自动收集：', text: '访问 IP、浏览器信息、Cookie、服务使用记录、页面访问时间' },
        { term: '付款时（如适用）：', text: '支付方式（卡号脱敏）、支付金额、支付货币。完整卡号由支付服务商直接处理，公司不予存储。' },
      ] },
      { title: '3. 个人信息的收集与使用目的', ordered: true, items: [
        '会员注册及本人确认',
        '提供服务（产品推荐、预约中介、翻译礼宾、支付处理）',
        '与医疗机构、合作伙伴之间的预约、诊疗及后续护理的衔接',
        '客户咨询应对、纠纷调解、审核及防止不当使用',
        '履行法定义务（如 KOIHA 外国患者招揽统计报告）',
      ] },
      { title: '4. 个人信息的保存与使用期限', items: [
        '会员信息：至注销会员为止（注销后 30 天内销毁）',
        '支付记录：依据《电子商务法》保存 5 年',
        '访问日志、IP：依据《通信秘密保护法》保存 3 个月',
        '外国患者招揽相关资料：依据《医疗海外进出法》保存 5 年',
        '纠纷处理记录：依据《电子商务法》保存 3 年',
      ] },
      { title: '5. 向第三方提供个人信息', ordered: true, items: [
        '原则上，公司未经用户同意不向外部提供个人信息。',
        { text: '例外情况下，在以下情形提供必要的最少信息：', sub: [
          '用户申请预约的医疗机构、合作伙伴：姓名、国家、联系方式、项目/产品信息、期望日程',
          '依据法律由侦查机关、保健福祉部等提出的正当要求',
        ] },
      ] },
      { title: '6. 个人信息处理的委托', lead: '为运营服务，公司可将以下业务委托给外部，并在委托时依据《个人信息保护法》签订安全管理合同。', items: [
        '云基础设施：Vercel Inc.、Supabase Inc.',
        'AI 翻译与分析：Google Cloud（Gemini）、OpenAI',
        '通讯软件渠道对接：Kakao、LINE、Meta、Naver、WeChat',
        '支付处理：国内外支付服务商（在预约确认阶段明示）',
      ] },
      { title: '7. 用户的权利及行使方法', ordered: true, items: [
        '用户可随时要求查阅、更正、删除本人个人信息或停止处理。',
        '注销会员可在账户设置页面自行办理，或通过下方保护负责人的联系方式申请。',
        '对未满 14 周岁儿童的信息处理需取得法定代理人的另行同意（目前仅限年满 14 周岁者注册）。',
      ] },
      { title: '8. Cookie 的使用', lead: '为提升使用便利性，公司使用 Cookie。用户可在浏览器设置中拒绝保存 Cookie，但部分功能（自动登录、语言设置等）可能受限。' },
      { title: '9. 个人信息安全保障措施', items: [
        '密码单向加密存储',
        '存储数据及传输过程加密（TLS 1.2 以上）',
        '访问权限最小化及访问日志监控',
        '定期安全检查及侵害应对程序',
      ] },
      { title: '10. 个人信息保护负责人', items: [
        '姓名：李东熙（Shareart 株式会社 个人信息保护负责人）',
        '邮箱：ldh9271@gmail.com',
        '工作时间：工作日 09:00–18:00（韩国时间）',
      ] },
      { title: '11. 修订记录', lead: '本政策可能因法律或服务政策变更而修订，变更时将在生效日 7 天前通过服务内公告或注册邮箱通知。' },
    ],
    addendum: '附则：本政策自 2026 年 1 月 1 日起施行。',
  },

  ru: {
    metaTitle: 'Политика конфиденциальности · GlowUpTour',
    title: 'Политика конфиденциальности',
    effective: 'Вступает в силу: 1 января 2026 г. · Последняя редакция: 17 сентября 2026 г.',
    translationNotice: 'Это перевод для удобства. При расхождениях приоритет имеет оригинал на корейском языке.',
    backToSignup: 'Вернуться к регистрации',
    sections: [
      { title: '1. Общие положения', lead: 'Shareart Co., Ltd. («Компания») соблюдает Закон о защите персональных данных, Закон о поддержке зарубежной экспансии медицинской отрасли и привлечения иностранных пациентов и иные применимые законы и публикует настоящую Политику для безопасной обработки персональных данных пользователей.' },
      { title: '2. Собираемые персональные данные', items: [
        { term: 'При регистрации (обязательно):', text: 'e-mail, пароль (хранится в зашифрованном виде), имя, страна, номер телефона' },
        { term: 'При регистрации (по желанию):', text: 'тип и ID мессенджера (KakaoTalk / WhatsApp / LINE / WeChat и др.)' },
        { term: 'При запросах и бронировании:', text: 'интересующие категории процедур, желаемые даты, свободные заметки, прикреплённые изображения (по желанию)' },
        { term: 'Автоматически:', text: 'IP-адрес, данные браузера, cookie, история использования сервиса, время посещения страниц' },
        { term: 'При оплате (если применимо):', text: 'способ оплаты (маскированная карта), сумма, валюта. Полный номер карты обрабатывает платёжный провайдер; Компания его не хранит.' },
      ] },
      { title: '3. Цели сбора и использования', ordered: true, items: [
        'Регистрация и подтверждение личности',
        'Предоставление сервиса (рекомендации, посредничество при бронировании, консьерж с переводом, обработка платежей)',
        'Организация бронирования, консультаций и последующего ухода с медицинскими учреждениями и партнёрами',
        'Ответы на обращения, урегулирование споров, проверка и предотвращение злоупотреблений',
        'Исполнение требований закона (например, статистическая отчётность KOIHA о привлечении иностранных пациентов)',
      ] },
      { title: '4. Сроки хранения и использования', items: [
        'Данные участника: до удаления аккаунта (уничтожаются в течение 30 дней после удаления)',
        'Платёжные записи: 5 лет согласно Закону о защите потребителей в электронной торговле',
        'Логи доступа и IP: 3 месяца согласно Закону о защите тайны связи',
        'Материалы о привлечении иностранных пациентов: 5 лет согласно Закону о зарубежной экспансии медицины',
        'Записи о спорах: 3 года согласно Закону о защите потребителей в электронной торговле',
      ] },
      { title: '5. Передача третьим лицам', ordered: true, items: [
        'По общему правилу Компания не передаёт персональные данные третьим лицам без согласия пользователя.',
        { text: 'В порядке исключения минимально необходимые данные передаются в следующих случаях:', sub: [
          'Медицинскому учреждению или партнёру, у которого запрошено бронирование: имя, страна, способ связи, информация о процедуре/товаре, желаемые даты',
          'По законным запросам следственных органов, Министерства здравоохранения и социального обеспечения и т. п.',
        ] },
      ] },
      { title: '6. Поручение обработки', lead: 'Для работы сервиса Компания может поручать следующие задачи внешним исполнителям, заключая договоры о безопасной обработке в соответствии с Законом о защите персональных данных.', items: [
        'Облачная инфраструктура: Vercel Inc., Supabase Inc.',
        'AI-перевод и анализ: Google Cloud (Gemini), OpenAI',
        'Интеграция мессенджеров: Kakao, LINE, Meta, Naver, WeChat',
        'Обработка платежей: корейские и международные платёжные провайдеры (указываются при подтверждении бронирования)',
      ] },
      { title: '7. Права пользователя и порядок их реализации', ordered: true, items: [
        'Вы можете в любое время запросить доступ к своим данным, их исправление, удаление или приостановку обработки.',
        'Удалить аккаунт можно на странице настроек аккаунта или обратившись к ответственному за защиту данных (ниже).',
        'Обработка данных детей младше 14 лет требует отдельного согласия законного представителя (в настоящее время регистрация доступна только с 14 лет).',
      ] },
      { title: '8. Использование cookie', lead: 'Компания использует cookie для удобства пользования сервисом. Вы можете отключить cookie в настройках браузера, однако некоторые функции (автоматический вход, настройки языка и др.) могут быть ограничены.' },
      { title: '9. Меры безопасности', items: [
        'Хранение паролей с односторонним шифрованием',
        'Шифрование хранимых и передаваемых данных (TLS 1.2 и выше)',
        'Минимизация прав доступа и мониторинг журналов доступа',
        'Регулярные проверки безопасности и процедуры реагирования на инциденты',
      ] },
      { title: '10. Ответственный за защиту персональных данных', items: [
        'Имя: Ли Донхи (ответственный за защиту персональных данных, Shareart Co., Ltd.)',
        'E-mail: ldh9271@gmail.com',
        'Часы работы: будни 09:00–18:00 (KST)',
      ] },
      { title: '11. История изменений', lead: 'Политика может изменяться в связи с изменением законодательства или политики сервиса. Об изменениях сообщается в сервисе или по e-mail регистрации не позднее чем за 7 дней до вступления в силу.' },
    ],
    addendum: 'Дополнение: настоящая Политика вступает в силу 1 января 2026 г.',
  },

  vi: {
    metaTitle: 'Chính sách quyền riêng tư · GlowUpTour',
    title: 'Chính sách quyền riêng tư',
    effective: 'Có hiệu lực: 01/01/2026 · Sửa đổi gần nhất: 17/09/2026',
    translationNotice: 'Đây là bản dịch tham khảo. Nếu có khác biệt, bản gốc tiếng Hàn được ưu tiên áp dụng.',
    backToSignup: 'Quay lại đăng ký',
    sections: [
      { title: '1. Quy định chung', lead: 'Công ty Shareart Co., Ltd. (“Công ty”) tuân thủ Luật Bảo vệ thông tin cá nhân, Luật Hỗ trợ mở rộng y tế ra nước ngoài và thu hút bệnh nhân nước ngoài cùng các luật liên quan, và ban hành, công bố Chính sách này để xử lý an toàn thông tin cá nhân của người dùng.' },
      { title: '2. Thông tin cá nhân thu thập', items: [
        { term: 'Khi đăng ký (bắt buộc):', text: 'email, mật khẩu (lưu mã hóa), họ tên, quốc gia, số điện thoại' },
        { term: 'Khi đăng ký (tùy chọn):', text: 'loại ứng dụng nhắn tin và ID (KakaoTalk / WhatsApp / LINE / WeChat, v.v.)' },
        { term: 'Khi hỏi đáp, đặt chỗ:', text: 'danh mục liệu trình quan tâm, lịch mong muốn, ghi chú tự do, ảnh đính kèm (tùy chọn)' },
        { term: 'Thu thập tự động:', text: 'IP truy cập, thông tin trình duyệt, cookie, lịch sử sử dụng dịch vụ, thời điểm truy cập trang' },
        { term: 'Khi thanh toán (nếu có):', text: 'phương thức thanh toán (số thẻ được che), số tiền, loại tiền. Số thẻ đầy đủ do đơn vị thanh toán xử lý trực tiếp, Công ty không lưu.' },
      ] },
      { title: '3. Mục đích thu thập và sử dụng', ordered: true, items: [
        'Đăng ký thành viên và xác minh danh tính',
        'Cung cấp dịch vụ (gợi ý sản phẩm, trung gian đặt chỗ, hỗ trợ phiên dịch, xử lý thanh toán)',
        'Kết nối đặt chỗ, khám chữa và chăm sóc sau điều trị với cơ sở y tế, đối tác',
        'Giải đáp thắc mắc, hòa giải tranh chấp, kiểm duyệt và ngăn chặn sử dụng sai mục đích',
        'Thực hiện nghĩa vụ pháp luật (ví dụ báo cáo thống kê thu hút bệnh nhân nước ngoài cho KOIHA)',
      ] },
      { title: '4. Thời hạn lưu giữ và sử dụng', items: [
        'Thông tin thành viên: đến khi xóa tài khoản (hủy trong vòng 30 ngày sau khi xóa)',
        'Hồ sơ thanh toán: 5 năm theo Luật Thương mại điện tử',
        'Nhật ký truy cập, IP: 3 tháng theo Luật Bảo vệ bí mật thông tin liên lạc',
        'Tài liệu liên quan thu hút bệnh nhân nước ngoài: 5 năm theo Luật Mở rộng y tế ra nước ngoài',
        'Hồ sơ xử lý tranh chấp: 3 năm theo Luật Thương mại điện tử',
      ] },
      { title: '5. Cung cấp cho bên thứ ba', ordered: true, items: [
        'Về nguyên tắc, Công ty không cung cấp thông tin cá nhân ra bên ngoài khi chưa có sự đồng ý của người dùng.',
        { text: 'Ngoại lệ, Công ty cung cấp thông tin tối thiểu cần thiết trong các trường hợp sau:', sub: [
          'Cơ sở y tế, đối tác mà bạn yêu cầu đặt chỗ: họ tên, quốc gia, phương thức liên lạc, thông tin liệu trình/sản phẩm, lịch mong muốn',
          'Yêu cầu hợp pháp của cơ quan điều tra, Bộ Y tế và Phúc lợi, v.v. theo pháp luật',
        ] },
      ] },
      { title: '6. Ủy thác xử lý thông tin cá nhân', lead: 'Để vận hành dịch vụ, Công ty có thể ủy thác các công việc sau cho bên ngoài và ký hợp đồng quản lý an toàn theo Luật Bảo vệ thông tin cá nhân khi ủy thác.', items: [
        'Hạ tầng đám mây: Vercel Inc., Supabase Inc.',
        'Dịch và phân tích AI: Google Cloud (Gemini), OpenAI',
        'Kết nối kênh nhắn tin: Kakao, LINE, Meta, Naver, WeChat',
        'Xử lý thanh toán: các đơn vị thanh toán trong và ngoài nước (nêu rõ ở bước xác nhận đặt chỗ)',
      ] },
      { title: '7. Quyền của người dùng và cách thực hiện', ordered: true, items: [
        'Người dùng có thể yêu cầu xem, sửa, xóa hoặc tạm dừng xử lý thông tin cá nhân của mình bất cứ lúc nào.',
        'Có thể xóa tài khoản trực tiếp tại trang cài đặt tài khoản hoặc yêu cầu qua liên hệ của người phụ trách bảo vệ thông tin bên dưới.',
        'Việc xử lý thông tin của trẻ dưới 14 tuổi cần có sự đồng ý riêng của người đại diện hợp pháp (hiện chỉ người từ 14 tuổi trở lên được đăng ký).',
      ] },
      { title: '8. Sử dụng cookie', lead: 'Công ty sử dụng cookie để nâng cao tiện ích sử dụng. Người dùng có thể từ chối lưu cookie trong cài đặt trình duyệt, nhưng một số tính năng (tự động đăng nhập, cài đặt ngôn ngữ, v.v.) có thể bị hạn chế.' },
      { title: '9. Biện pháp bảo đảm an toàn', items: [
        'Lưu mật khẩu bằng mã hóa một chiều',
        'Mã hóa dữ liệu lưu trữ và đường truyền (TLS 1.2 trở lên)',
        'Giới hạn quyền truy cập tối thiểu và giám sát nhật ký truy cập',
        'Kiểm tra bảo mật định kỳ và quy trình ứng phó sự cố',
      ] },
      { title: '10. Người phụ trách bảo vệ thông tin cá nhân', items: [
        'Họ tên: Lee Donghee (Người phụ trách bảo vệ thông tin cá nhân, Shareart Co., Ltd.)',
        'Email: ldh9271@gmail.com',
        'Giờ làm việc: ngày thường 09:00–18:00 (giờ Hàn Quốc)',
      ] },
      { title: '11. Lịch sử sửa đổi', lead: 'Chính sách này có thể được sửa đổi theo thay đổi của pháp luật hoặc chính sách dịch vụ; khi thay đổi sẽ thông báo trong dịch vụ hoặc qua email đăng ký trước ngày hiệu lực 7 ngày.' },
    ],
    addendum: 'Phụ lục: Chính sách này có hiệu lực từ ngày 01/01/2026.',
  },
};
