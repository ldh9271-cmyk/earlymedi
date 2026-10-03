import type { LegalDocs } from './types';

/**
 * 이용약관 — 한국어 원문 + 5개 언어 번역 (2026-10-03). 조항을 고치면 6개 언어를 함께 고친다.
 * 회사 표기줄은 사전 siteFooter.business 를 쓰므로 여기 없다.
 */
export const TERMS: LegalDocs = {
  kr: {
    metaTitle: '이용약관 · 글로우업투어',
    title: '이용약관',
    effective: '시행일: 2026년 1월 1일 · 최근 개정: 2026년 9월 17일',
    backToSignup: '가입으로 돌아가기',
    sections: [
      { title: '제1조 (목적)', lead: '본 약관은 주식회사 쉐어아트(이하 “회사”)가 운영하는 글로우업투어(GlowUpTour) 의료관광 플랫폼(이하 “서비스”)의 이용과 관련하여 회사와 게스트 회원(이하 “이용자”) 간의 권리, 의무, 책임사항 및 서비스 이용 절차를 규정함을 목적으로 합니다.' },
      { title: '제2조 (정의)', ordered: true, items: [
        { term: '서비스', text: '란 회사가 제공하는 의료기관 · 미용 · 호텔 · 음식점 · K-팝 투어 등 관광 콘텐츠 예약 중개와 1:1 통역 컨시어지를 통칭합니다.' },
        { term: '이용자', text: '란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.' },
        { term: '의료기관 · 파트너업체', text: '란 회사와 별도 계약을 체결하고 서비스를 통해 자신의 상품 또는 시술을 제공하는 제3자를 말합니다.' },
        { term: '유치업체', text: '란 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」에 따라 외국인환자 유치업으로 등록된 사업자를 말합니다.' },
      ] },
      { title: '제3조 (약관의 효력 및 변경)', ordered: true, items: [
        '본 약관은 이용자가 회원가입 시 동의함으로써 효력이 발생합니다.',
        '회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 사전에 서비스 내 공지 또는 가입 시 등록한 이메일로 통지합니다.',
        '이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.',
      ] },
      { title: '제4조 (서비스의 내용)', ordered: true, items: [
        '회사는 의료기관·유치업체·파트너업체가 등록한 상품(시술·코스·호텔·식당·뷰티 프로그램 등)을 검색, 비교, 예약 문의할 수 있는 플랫폼을 제공합니다.',
        '회사는 직접 의료행위를 수행하지 않으며, 실제 진료 · 시술은 해당 의료기관이 자신의 책임으로 이행합니다.',
        '회사는 24시간 다국어(한국어 · 영어 · 중국어 · 일본어 · 러시아어 · 베트남어) AI 통역과 컨시어지를 제공합니다.',
      ] },
      { title: '제5조 (계정 및 보안)', ordered: true, items: [
        '이용자는 본인의 정확한 정보로 가입해야 하며, 타인의 정보를 도용하거나 허위로 기재해서는 안 됩니다.',
        '이용자는 본인의 계정 정보(아이디 · 비밀번호 · 메신저 ID)를 안전하게 관리할 책임을 집니다.',
        '계정 도용이 의심되는 경우 즉시 회사에 통지하고 비밀번호를 변경해야 합니다.',
      ] },
      { title: '제6조 (예약 · 결제 · 취소)', ordered: true, items: [
        '예약은 이용자의 문의 접수 후 회사 또는 해당 의료기관 · 파트너의 확정 통지로 성립합니다.',
        '결제 수단, 통화, 환율, 부가가치세, 예약금 정책은 상품별로 상이할 수 있으며 예약 확정 단계에서 명시됩니다.',
        '예약 취소 · 환불 정책은 의료기관 또는 파트너의 정책에 따르며, 시술 직전 취소 · 노쇼에 대해서는 위약금이 부과될 수 있습니다.',
        '의료적 사유 · 천재지변 등 불가항력으로 인한 취소는 별도 환불 정책이 적용됩니다.',
      ] },
      { title: '제7조 (이용자의 의무)', lead: '이용자는 다음 행위를 해서는 안 됩니다.', ordered: true, items: [
        '허위 정보 등록, 타인 명의 도용, 결제 정보 위변조',
        '의료기관 · 파트너 · 다른 이용자에 대한 위협, 모욕, 명예훼손',
        '서비스 운영을 방해하거나 자동화 도구로 데이터를 무단 수집하는 행위',
        '지적재산권을 침해하거나 회사 또는 제3자의 권리를 침해하는 행위',
      ] },
      { title: '제8조 (책임의 제한)', ordered: true, items: [
        '회사는 의료기관 · 파트너의 실제 의료행위 · 서비스 품질에 대해 직접적 의료적 책임을 부담하지 않습니다. 다만 플랫폼 운영자로서 등록 정보의 정확성, 분쟁 조정 협조, 검수 절차 운영에 책임을 집니다.',
        '회사는 천재지변, 정전, 네트워크 장애 등 회사의 합리적 통제 범위를 벗어난 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.',
        '이용자의 부주의로 인한 계정 도용 · 비밀번호 유출에 대해 회사는 책임을 부담하지 않습니다.',
      ] },
      { title: '제9조 (지적재산권)', lead: '서비스 내 콘텐츠 · 디자인 · 상표 · 코드는 회사 또는 정당한 권리자에게 귀속됩니다. 이용자는 회사의 사전 동의 없이 이를 복제, 배포, 2차 가공할 수 없습니다.' },
      { title: '제10조 (분쟁 해결 및 준거법)', ordered: true, items: [
        '본 약관은 대한민국 법률에 따라 해석됩니다.',
        '회사와 이용자 간 분쟁은 우선 협의로 해결하며, 협의가 이루어지지 않을 경우 서울중앙지방법원을 제1심 관할 법원으로 합니다.',
      ] },
      { title: '제11조 (문의)', lead: '본 약관에 관한 문의는 다음 연락처로 접수해 주시기 바랍니다.', items: [
        '이메일: ldh9271@gmail.com',
        '운영 시간: 평일 09:00 – 18:00 (KST)',
      ] },
    ],
    addendum: '부칙: 본 약관은 2026년 1월 1일부터 시행합니다.',
  },

  en: {
    metaTitle: 'Terms of Service · GlowUpTour',
    title: 'Terms of Service',
    effective: 'Effective: January 1, 2026 · Last revised: September 17, 2026',
    translationNotice: 'This is a translation for your convenience. If there is any discrepancy, the Korean original prevails.',
    backToSignup: 'Back to sign-up',
    sections: [
      { title: 'Article 1 (Purpose)', lead: 'These Terms set out the rights, obligations and responsibilities between Shareart Co., Ltd. (the “Company”) and guest members (“Users”), and the procedures for using the GlowUpTour medical-tourism platform operated by the Company (the “Service”).' },
      { title: 'Article 2 (Definitions)', ordered: true, items: [
        { term: '“Service”', text: 'means the booking intermediation of medical institutions, beauty services, hotels, restaurants, K-pop tours and other travel content provided by the Company, together with the 1:1 interpretation concierge.' },
        { term: '“User”', text: 'means a person who agrees to these Terms and uses the Service provided by the Company.' },
        { term: '“Medical institution / Partner”', text: 'means a third party that has a separate contract with the Company and offers its own products or treatments through the Service.' },
        { term: '“Attraction agency”', text: 'means a business registered to attract international patients under the Act on Support for Overseas Expansion of Healthcare Industry and Attraction of International Patients.' },
      ] },
      { title: 'Article 3 (Effect and amendment of the Terms)', ordered: true, items: [
        'These Terms take effect when the User agrees to them at sign-up.',
        'The Company may amend these Terms within the limits of applicable law. Amendments are announced in advance within the Service or by email to the address registered at sign-up.',
        'A User who does not agree to the amended Terms may stop using the Service and request account deletion.',
      ] },
      { title: 'Article 4 (Content of the Service)', ordered: true, items: [
        'The Company provides a platform where Users can search, compare and make booking inquiries for products registered by medical institutions, attraction agencies and partners (treatments, courses, hotels, restaurants, beauty programs, etc.).',
        'The Company does not itself perform medical procedures. Actual consultations and treatments are performed by the relevant medical institution at its own responsibility.',
        'The Company provides 24-hour multilingual (Korean, English, Chinese, Japanese, Russian, Vietnamese) AI interpretation and concierge services.',
      ] },
      { title: 'Article 5 (Accounts and security)', ordered: true, items: [
        'Users must sign up with their own accurate information and must not use another person’s information or provide false information.',
        'Users are responsible for keeping their account details (ID, password, messenger ID) secure.',
        'If account theft is suspected, the User must notify the Company immediately and change the password.',
      ] },
      { title: 'Article 6 (Booking, payment and cancellation)', ordered: true, items: [
        'A booking is concluded when, after the User’s inquiry is received, the Company or the relevant medical institution/partner sends a confirmation.',
        'Payment methods, currency, exchange rates, VAT and deposit policies may differ by product and are stated at the booking confirmation stage.',
        'Cancellation and refund policies follow those of the medical institution or partner. A penalty may apply to cancellations immediately before treatment or to no-shows.',
        'Cancellations due to force majeure such as medical reasons or natural disasters are subject to a separate refund policy.',
      ] },
      { title: 'Article 7 (User obligations)', lead: 'Users must not:', ordered: true, items: [
        'Register false information, use another person’s identity, or forge or alter payment information.',
        'Threaten, insult or defame medical institutions, partners or other Users.',
        'Interfere with the operation of the Service or collect data without permission using automated tools.',
        'Infringe intellectual property rights or the rights of the Company or any third party.',
      ] },
      { title: 'Article 8 (Limitation of liability)', ordered: true, items: [
        'The Company bears no direct medical liability for the actual medical procedures or service quality of medical institutions and partners. As the platform operator, however, the Company is responsible for the accuracy of registered information, cooperation in dispute mediation and operation of its review procedures.',
        'The Company is not liable for service interruptions caused by events beyond its reasonable control, such as natural disasters, power outages or network failures.',
        'The Company is not liable for account theft or password leaks caused by the User’s negligence.',
      ] },
      { title: 'Article 9 (Intellectual property)', lead: 'Content, designs, trademarks and code within the Service belong to the Company or the rightful owner. Users may not copy, distribute or create derivative works from them without the Company’s prior consent.' },
      { title: 'Article 10 (Dispute resolution and governing law)', ordered: true, items: [
        'These Terms are interpreted in accordance with the laws of the Republic of Korea.',
        'Disputes between the Company and a User are first resolved by consultation. If no agreement is reached, the Seoul Central District Court has jurisdiction in the first instance.',
      ] },
      { title: 'Article 11 (Contact)', lead: 'Please send any questions about these Terms to the contact below.', items: [
        'Email: ldh9271@gmail.com',
        'Hours: weekdays 09:00–18:00 (KST)',
      ] },
    ],
    addendum: 'Addendum: These Terms take effect on January 1, 2026.',
  },

  ja: {
    metaTitle: '利用規約 · GlowUpTour',
    title: '利用規約',
    effective: '施行日：2026年1月1日 · 最終改定：2026年9月17日',
    translationNotice: 'このページは参考訳です。内容に相違がある場合は韓国語の原文が優先されます。',
    backToSignup: '会員登録に戻る',
    sections: [
      { title: '第1条（目的）', lead: '本規約は、株式会社シェアアート（以下「当社」）が運営する医療観光プラットフォーム GlowUpTour（以下「本サービス」）の利用に関し、当社とゲスト会員（以下「利用者」）の権利・義務・責任事項および利用手続きを定めることを目的とします。' },
      { title: '第2条（定義）', ordered: true, items: [
        { term: '「本サービス」', text: 'とは、当社が提供する医療機関・美容・ホテル・飲食店・K-POPツアーなどの観光コンテンツの予約仲介および1対1の通訳コンシェルジュを総称します。' },
        { term: '「利用者」', text: 'とは、本規約に同意し、当社が提供する本サービスを利用する者をいいます。' },
        { term: '「医療機関・パートナー」', text: 'とは、当社と別途契約を締結し、本サービスを通じて自らの商品または施術を提供する第三者をいいます。' },
        { term: '「誘致事業者」', text: 'とは、「医療海外進出および外国人患者誘致支援に関する法律」に基づき外国人患者誘致業として登録された事業者をいいます。' },
      ] },
      { title: '第3条（規約の効力および変更）', ordered: true, items: [
        '本規約は、利用者が会員登録時に同意することにより効力が生じます。',
        '当社は関連法令に反しない範囲で本規約を変更でき、変更時は事前にサービス内の告知または登録メールアドレスへの通知で知らせます。',
        '利用者が変更後の規約に同意しない場合は、本サービスの利用を中止し、退会を請求できます。',
      ] },
      { title: '第4条（サービスの内容）', ordered: true, items: [
        '当社は、医療機関・誘致事業者・パートナーが登録した商品（施術・コース・ホテル・飲食店・ビューティープログラムなど）を検索・比較し、予約の問い合わせができるプラットフォームを提供します。',
        '当社は医療行為を直接行いません。実際の診療・施術は当該医療機関が自らの責任で行います。',
        '当社は24時間、多言語（韓国語・英語・中国語・日本語・ロシア語・ベトナム語）のAI通訳とコンシェルジュを提供します。',
      ] },
      { title: '第5条（アカウントおよびセキュリティ）', ordered: true, items: [
        '利用者は本人の正確な情報で登録しなければならず、他人の情報を盗用したり虚偽の記載をしたりしてはなりません。',
        '利用者はアカウント情報（ID・パスワード・メッセンジャーID）を安全に管理する責任を負います。',
        'アカウントの不正利用が疑われる場合は、直ちに当社に通知し、パスワードを変更しなければなりません。',
      ] },
      { title: '第6条（予約・決済・キャンセル）', ordered: true, items: [
        '予約は、利用者の問い合わせ受付後、当社または当該医療機関・パートナーの確定通知により成立します。',
        '決済手段、通貨、為替レート、付加価値税、予約金の方針は商品ごとに異なる場合があり、予約確定の段階で明示します。',
        '予約のキャンセル・返金方針は医療機関またはパートナーの方針に従い、施術直前のキャンセルやノーショーには違約金が発生することがあります。',
        '医療上の理由・天災など不可抗力によるキャンセルには別途の返金方針が適用されます。',
      ] },
      { title: '第7条（利用者の義務）', lead: '利用者は次の行為をしてはなりません。', ordered: true, items: [
        '虚偽情報の登録、他人名義の盗用、決済情報の偽造・改ざん',
        '医療機関・パートナー・他の利用者に対する脅迫、侮辱、名誉毀損',
        'サービス運営の妨害、自動化ツールによるデータの無断収集',
        '知的財産権の侵害、当社または第三者の権利の侵害',
      ] },
      { title: '第8条（責任の制限）', ordered: true, items: [
        '当社は、医療機関・パートナーの実際の医療行為・サービス品質について直接の医療上の責任を負いません。ただし、プラットフォーム運営者として、登録情報の正確性、紛争調整への協力、審査手続きの運営について責任を負います。',
        '当社は、天災、停電、ネットワーク障害など当社の合理的な管理範囲を超える事由によるサービス中断について責任を負いません。',
        '利用者の不注意によるアカウントの不正利用・パスワードの漏えいについて、当社は責任を負いません。',
      ] },
      { title: '第9条（知的財産権）', lead: '本サービス内のコンテンツ・デザイン・商標・コードは当社または正当な権利者に帰属します。利用者は当社の事前の同意なく、これらを複製、配布、二次加工することはできません。' },
      { title: '第10条（紛争解決および準拠法）', ordered: true, items: [
        '本規約は大韓民国の法律に従って解釈されます。',
        '当社と利用者の間の紛争はまず協議により解決し、協議が整わない場合はソウル中央地方法院を第一審の管轄裁判所とします。',
      ] },
      { title: '第11条（お問い合わせ）', lead: '本規約に関するお問い合わせは下記までご連絡ください。', items: [
        'メール：ldh9271@gmail.com',
        '対応時間：平日 09:00〜18:00（KST）',
      ] },
    ],
    addendum: '附則：本規約は2026年1月1日から施行します。',
  },

  zh: {
    metaTitle: '服务条款 · GlowUpTour',
    title: '服务条款',
    effective: '生效日期：2026年1月1日 · 最近修订：2026年9月17日',
    translationNotice: '本页面为参考译文。如内容存在差异，以韩文原文为准。',
    backToSignup: '返回注册',
    sections: [
      { title: '第1条（目的）', lead: '本条款旨在规定 Shareart 株式会社（以下简称“公司”）运营的医疗旅游平台 GlowUpTour（以下简称“本服务”）的使用中，公司与访客会员（以下简称“用户”）之间的权利、义务、责任事项及服务使用程序。' },
      { title: '第2条（定义）', ordered: true, items: [
        { term: '“本服务”', text: '指公司提供的医疗机构、美容、酒店、餐厅、K-pop 旅游等旅游内容的预约中介以及一对一翻译礼宾服务的总称。' },
        { term: '“用户”', text: '指同意本条款并使用公司所提供服务的人。' },
        { term: '“医疗机构·合作伙伴”', text: '指与公司另行签订合同，通过本服务提供自身产品或医疗项目的第三方。' },
        { term: '“招揽机构”', text: '指依据《医疗海外进出及外国患者招揽支援法》登记为外国患者招揽业的经营者。' },
      ] },
      { title: '第3条（条款的效力及变更）', ordered: true, items: [
        '本条款自用户在注册时同意起生效。',
        '公司可在不违反相关法律的范围内变更本条款，变更时将提前在服务内公告或通过注册时登记的邮箱通知。',
        '用户若不同意变更后的条款，可停止使用本服务并申请注销会员。',
      ] },
      { title: '第4条（服务内容）', ordered: true, items: [
        '公司提供一个平台，用户可在其中搜索、比较医疗机构、招揽机构、合作伙伴登记的产品（医疗项目、疗程、酒店、餐厅、美容项目等）并进行预约咨询。',
        '公司不直接实施医疗行为，实际诊疗与医疗项目由相应医疗机构自行负责实施。',
        '公司提供 24 小时多语言（韩语、英语、中文、日语、俄语、越南语）AI 翻译及礼宾服务。',
      ] },
      { title: '第5条（账户与安全）', ordered: true, items: [
        '用户须以本人真实信息注册，不得盗用他人信息或填写虚假信息。',
        '用户有责任妥善保管本人账户信息（ID、密码、通讯软件 ID）。',
        '怀疑账户被盗用时，应立即通知公司并更改密码。',
      ] },
      { title: '第6条（预约·付款·取消）', ordered: true, items: [
        '预约在用户咨询受理后，经公司或相应医疗机构、合作伙伴发出确认通知时成立。',
        '付款方式、货币、汇率、增值税及定金政策可能因产品而异，并在预约确认阶段明示。',
        '预约取消及退款政策遵循医疗机构或合作伙伴的政策；临近项目前取消或未到场可能收取违约金。',
        '因医疗原因、自然灾害等不可抗力导致的取消，适用单独的退款政策。',
      ] },
      { title: '第7条（用户义务）', lead: '用户不得从事以下行为：', ordered: true, items: [
        '登记虚假信息、盗用他人名义、伪造或篡改付款信息',
        '对医疗机构、合作伙伴或其他用户进行威胁、侮辱、诽谤',
        '妨碍服务运营，或使用自动化工具擅自收集数据',
        '侵犯知识产权，或侵犯公司或第三方的权利',
      ] },
      { title: '第8条（责任限制）', ordered: true, items: [
        '公司对医疗机构、合作伙伴的实际医疗行为及服务质量不承担直接的医疗责任。但作为平台运营者，公司对登记信息的准确性、协助纠纷调解及审核程序的运营负责。',
        '对于自然灾害、停电、网络故障等超出公司合理控制范围的原因导致的服务中断，公司不承担责任。',
        '因用户疏忽导致的账户被盗用或密码泄露，公司不承担责任。',
      ] },
      { title: '第9条（知识产权）', lead: '本服务内的内容、设计、商标、代码归公司或合法权利人所有。未经公司事先同意，用户不得复制、传播或进行二次加工。' },
      { title: '第10条（纠纷解决及准据法）', ordered: true, items: [
        '本条款依据大韩民国法律解释。',
        '公司与用户之间的纠纷首先通过协商解决；协商不成时，以首尔中央地方法院为第一审管辖法院。',
      ] },
      { title: '第11条（咨询）', lead: '有关本条款的咨询，请通过以下方式联系：', items: [
        '邮箱：ldh9271@gmail.com',
        '工作时间：工作日 09:00–18:00（韩国时间）',
      ] },
    ],
    addendum: '附则：本条款自 2026 年 1 月 1 日起施行。',
  },

  ru: {
    metaTitle: 'Условия использования · GlowUpTour',
    title: 'Условия использования',
    effective: 'Вступают в силу: 1 января 2026 г. · Последняя редакция: 17 сентября 2026 г.',
    translationNotice: 'Это перевод для удобства. При расхождениях приоритет имеет оригинал на корейском языке.',
    backToSignup: 'Вернуться к регистрации',
    sections: [
      { title: 'Статья 1 (Цель)', lead: 'Настоящие Условия определяют права, обязанности и ответственность компании Shareart Co., Ltd. («Компания») и гостевых участников («Пользователи»), а также порядок использования платформы медицинского туризма GlowUpTour, которой управляет Компания («Сервис»).' },
      { title: 'Статья 2 (Определения)', ordered: true, items: [
        { term: '«Сервис»', text: '— посредничество при бронировании медицинских учреждений, услуг красоты, отелей, ресторанов, K-pop туров и другого туристического контента, предоставляемое Компанией, а также консьерж-сервис с переводом 1:1.' },
        { term: '«Пользователь»', text: '— лицо, принявшее настоящие Условия и использующее Сервис Компании.' },
        { term: '«Медицинское учреждение / Партнёр»', text: '— третье лицо, заключившее с Компанией отдельный договор и предлагающее свои товары или процедуры через Сервис.' },
        { term: '«Агентство по привлечению пациентов»', text: '— организация, зарегистрированная для привлечения иностранных пациентов в соответствии с Законом о поддержке зарубежной экспансии медицинской отрасли и привлечения иностранных пациентов.' },
      ] },
      { title: 'Статья 3 (Действие и изменение Условий)', ordered: true, items: [
        'Условия вступают в силу с момента их принятия Пользователем при регистрации.',
        'Компания может изменять Условия в рамках действующего законодательства; об изменениях сообщается заранее в Сервисе или по электронной почте, указанной при регистрации.',
        'Пользователь, не согласный с изменёнными Условиями, может прекратить использование Сервиса и запросить удаление аккаунта.',
      ] },
      { title: 'Статья 4 (Содержание Сервиса)', ordered: true, items: [
        'Компания предоставляет платформу для поиска, сравнения и запроса бронирования товаров, зарегистрированных медицинскими учреждениями, агентствами и партнёрами (процедуры, программы, отели, рестораны, бьюти-программы и т. д.).',
        'Компания не оказывает медицинские услуги самостоятельно. Консультации и процедуры проводит соответствующее медицинское учреждение под свою ответственность.',
        'Компания предоставляет круглосуточный многоязычный (корейский, английский, китайский, японский, русский, вьетнамский) AI-перевод и консьерж-сервис.',
      ] },
      { title: 'Статья 5 (Аккаунт и безопасность)', ordered: true, items: [
        'Пользователь обязан регистрироваться с собственными достоверными данными и не вправе использовать чужие данные или указывать ложные сведения.',
        'Пользователь несёт ответственность за сохранность данных своего аккаунта (ID, пароль, ID мессенджера).',
        'При подозрении на взлом аккаунта Пользователь должен немедленно уведомить Компанию и сменить пароль.',
      ] },
      { title: 'Статья 6 (Бронирование, оплата и отмена)', ordered: true, items: [
        'Бронирование считается заключённым после получения запроса Пользователя и подтверждения от Компании или соответствующего медицинского учреждения/партнёра.',
        'Способы оплаты, валюта, курс, НДС и условия предоплаты могут различаться по товарам и указываются на этапе подтверждения бронирования.',
        'Условия отмены и возврата определяются медицинским учреждением или партнёром; за отмену непосредственно перед процедурой или неявку может взиматься штраф.',
        'К отменам по медицинским причинам или вследствие форс-мажора (стихийные бедствия и т. п.) применяется отдельная политика возврата.',
      ] },
      { title: 'Статья 7 (Обязанности Пользователя)', lead: 'Пользователю запрещается:', ordered: true, items: [
        'регистрировать ложные сведения, использовать чужое имя, подделывать или изменять платёжные данные;',
        'угрожать, оскорблять или порочить медицинские учреждения, партнёров и других Пользователей;',
        'мешать работе Сервиса или собирать данные без разрешения с помощью автоматизированных средств;',
        'нарушать права интеллектуальной собственности или иные права Компании и третьих лиц.',
      ] },
      { title: 'Статья 8 (Ограничение ответственности)', ordered: true, items: [
        'Компания не несёт прямой медицинской ответственности за фактические медицинские процедуры и качество услуг медицинских учреждений и партнёров. Как оператор платформы Компания отвечает за точность зарегистрированной информации, содействие в урегулировании споров и работу процедур проверки.',
        'Компания не несёт ответственности за перерывы в работе Сервиса по причинам вне её разумного контроля: стихийные бедствия, отключение электроэнергии, сбои сети и т. п.',
        'Компания не несёт ответственности за взлом аккаунта или утечку пароля по неосторожности Пользователя.',
      ] },
      { title: 'Статья 9 (Интеллектуальная собственность)', lead: 'Контент, дизайн, товарные знаки и код Сервиса принадлежат Компании или законным правообладателям. Пользователь не вправе копировать, распространять или перерабатывать их без предварительного согласия Компании.' },
      { title: 'Статья 10 (Разрешение споров и применимое право)', ordered: true, items: [
        'Настоящие Условия толкуются в соответствии с законодательством Республики Корея.',
        'Споры между Компанией и Пользователем сначала разрешаются путём переговоров; при недостижении согласия суд первой инстанции — Центральный окружной суд Сеула.',
      ] },
      { title: 'Статья 11 (Контакты)', lead: 'Вопросы по настоящим Условиям направляйте по контактам ниже.', items: [
        'E-mail: ldh9271@gmail.com',
        'Часы работы: будни 09:00–18:00 (KST)',
      ] },
    ],
    addendum: 'Дополнение: настоящие Условия вступают в силу 1 января 2026 г.',
  },

  vi: {
    metaTitle: 'Điều khoản dịch vụ · GlowUpTour',
    title: 'Điều khoản dịch vụ',
    effective: 'Có hiệu lực: 01/01/2026 · Sửa đổi gần nhất: 17/09/2026',
    translationNotice: 'Đây là bản dịch tham khảo. Nếu có khác biệt, bản gốc tiếng Hàn được ưu tiên áp dụng.',
    backToSignup: 'Quay lại đăng ký',
    sections: [
      { title: 'Điều 1 (Mục đích)', lead: 'Điều khoản này quy định quyền, nghĩa vụ, trách nhiệm và thủ tục sử dụng dịch vụ giữa Công ty Shareart Co., Ltd. (“Công ty”) và thành viên khách (“Người dùng”) liên quan đến việc sử dụng nền tảng du lịch y tế GlowUpTour do Công ty vận hành (“Dịch vụ”).' },
      { title: 'Điều 2 (Định nghĩa)', ordered: true, items: [
        { term: '“Dịch vụ”', text: 'là tên gọi chung cho hoạt động trung gian đặt chỗ các cơ sở y tế, làm đẹp, khách sạn, nhà hàng, tour K-pop và nội dung du lịch khác do Công ty cung cấp, cùng dịch vụ hỗ trợ phiên dịch 1:1.' },
        { term: '“Người dùng”', text: 'là người đồng ý với Điều khoản này và sử dụng Dịch vụ do Công ty cung cấp.' },
        { term: '“Cơ sở y tế / Đối tác”', text: 'là bên thứ ba ký hợp đồng riêng với Công ty và cung cấp sản phẩm hoặc dịch vụ điều trị của mình thông qua Dịch vụ.' },
        { term: '“Đơn vị thu hút bệnh nhân”', text: 'là doanh nghiệp đã đăng ký ngành thu hút bệnh nhân nước ngoài theo Luật Hỗ trợ mở rộng y tế ra nước ngoài và thu hút bệnh nhân nước ngoài.' },
      ] },
      { title: 'Điều 3 (Hiệu lực và thay đổi Điều khoản)', ordered: true, items: [
        'Điều khoản này có hiệu lực khi Người dùng đồng ý lúc đăng ký thành viên.',
        'Công ty có thể thay đổi Điều khoản trong phạm vi không trái pháp luật; khi thay đổi sẽ thông báo trước trong Dịch vụ hoặc qua email đã đăng ký.',
        'Người dùng không đồng ý với Điều khoản đã thay đổi có thể ngừng sử dụng Dịch vụ và yêu cầu xóa tài khoản.',
      ] },
      { title: 'Điều 4 (Nội dung Dịch vụ)', ordered: true, items: [
        'Công ty cung cấp nền tảng để tìm kiếm, so sánh và gửi yêu cầu đặt chỗ các sản phẩm do cơ sở y tế, đơn vị thu hút bệnh nhân và đối tác đăng ký (liệu trình, gói, khách sạn, nhà hàng, chương trình làm đẹp, v.v.).',
        'Công ty không trực tiếp thực hiện hành vi y tế. Việc khám và điều trị thực tế do cơ sở y tế tương ứng thực hiện và tự chịu trách nhiệm.',
        'Công ty cung cấp phiên dịch AI và hỗ trợ đa ngôn ngữ 24 giờ (tiếng Hàn, Anh, Trung, Nhật, Nga, Việt).',
      ] },
      { title: 'Điều 5 (Tài khoản và bảo mật)', ordered: true, items: [
        'Người dùng phải đăng ký bằng thông tin chính xác của bản thân, không được mạo danh người khác hoặc khai báo sai.',
        'Người dùng chịu trách nhiệm bảo quản an toàn thông tin tài khoản của mình (ID, mật khẩu, ID ứng dụng nhắn tin).',
        'Khi nghi ngờ tài khoản bị chiếm đoạt, phải thông báo ngay cho Công ty và đổi mật khẩu.',
      ] },
      { title: 'Điều 6 (Đặt chỗ, thanh toán, hủy)', ordered: true, items: [
        'Đặt chỗ được xác lập khi Công ty hoặc cơ sở y tế/đối tác gửi thông báo xác nhận sau khi tiếp nhận yêu cầu của Người dùng.',
        'Phương thức thanh toán, loại tiền, tỷ giá, thuế VAT và chính sách đặt cọc có thể khác nhau theo sản phẩm và được nêu rõ ở bước xác nhận đặt chỗ.',
        'Chính sách hủy và hoàn tiền theo quy định của cơ sở y tế hoặc đối tác; hủy ngay trước khi điều trị hoặc không đến có thể bị tính phí phạt.',
        'Hủy do lý do y tế, thiên tai hoặc bất khả kháng khác áp dụng chính sách hoàn tiền riêng.',
      ] },
      { title: 'Điều 7 (Nghĩa vụ của Người dùng)', lead: 'Người dùng không được:', ordered: true, items: [
        'Đăng ký thông tin sai, mạo danh người khác, giả mạo hoặc sửa đổi thông tin thanh toán',
        'Đe dọa, xúc phạm, bôi nhọ cơ sở y tế, đối tác hoặc người dùng khác',
        'Cản trở vận hành Dịch vụ hoặc thu thập dữ liệu trái phép bằng công cụ tự động',
        'Xâm phạm quyền sở hữu trí tuệ hoặc quyền của Công ty hay bên thứ ba',
      ] },
      { title: 'Điều 8 (Giới hạn trách nhiệm)', ordered: true, items: [
        'Công ty không chịu trách nhiệm y tế trực tiếp đối với hành vi y tế thực tế và chất lượng dịch vụ của cơ sở y tế, đối tác. Tuy nhiên, với tư cách đơn vị vận hành nền tảng, Công ty chịu trách nhiệm về tính chính xác của thông tin đăng ký, hợp tác hòa giải tranh chấp và vận hành quy trình kiểm duyệt.',
        'Công ty không chịu trách nhiệm về gián đoạn Dịch vụ do nguyên nhân ngoài tầm kiểm soát hợp lý như thiên tai, mất điện, sự cố mạng.',
        'Công ty không chịu trách nhiệm về việc tài khoản bị chiếm đoạt hoặc lộ mật khẩu do sự bất cẩn của Người dùng.',
      ] },
      { title: 'Điều 9 (Quyền sở hữu trí tuệ)', lead: 'Nội dung, thiết kế, nhãn hiệu và mã nguồn trong Dịch vụ thuộc về Công ty hoặc chủ sở hữu hợp pháp. Người dùng không được sao chép, phân phối hay tạo tác phẩm phái sinh khi chưa có sự đồng ý trước của Công ty.' },
      { title: 'Điều 10 (Giải quyết tranh chấp và luật áp dụng)', ordered: true, items: [
        'Điều khoản này được giải thích theo pháp luật Hàn Quốc.',
        'Tranh chấp giữa Công ty và Người dùng trước hết được giải quyết bằng thương lượng; nếu không đạt được thỏa thuận, Tòa án Quận Trung tâm Seoul là tòa án sơ thẩm có thẩm quyền.',
      ] },
      { title: 'Điều 11 (Liên hệ)', lead: 'Mọi thắc mắc về Điều khoản này xin gửi đến:', items: [
        'Email: ldh9271@gmail.com',
        'Giờ làm việc: ngày thường 09:00–18:00 (giờ Hàn Quốc)',
      ] },
    ],
    addendum: 'Phụ lục: Điều khoản này có hiệu lực từ ngày 01/01/2026.',
  },
};
