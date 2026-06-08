/**
 * Public registry of every messenger KoreaGlowUp can integrate with. Used
 * by the /agency/channels page to render the connection grid, and by
 * server actions to validate `kind` against allowed values.
 *
 * Each entry tells the UI:
 *   - what icon/name/blurb to show
 *   - which credentials to ask the user for (per-kind connection form)
 *   - whether the integration is real or "coming soon"
 *   - the webhook URL the user must paste into the messenger's dev console
 */

export type ChannelKind =
  | 'kakao'
  | 'line'
  | 'telegram'
  | 'whatsapp'
  | 'instagram'
  | 'messenger' // Facebook Messenger
  | 'naver'
  | 'wechat';

export type ChannelDef = {
  kind: ChannelKind;
  /** Display name (Korean). */
  label: string;
  /** One-line description for the connection card. */
  description: string;
  /** Brand color token used for the icon badge. */
  brand: 'kakao' | 'line' | 'telegram' | 'whatsapp' | 'instagram' | 'facebook' | 'naver' | 'wechat';
  /** Solid hex for the icon background. */
  color: string;
  /** Single-character or short emoji shown in the icon tile. */
  emoji: string;
  /** Where the user actually does the upstream setup. */
  devConsoleUrl: string;
  /**
   * Whether we ship a real connection form for this channel. Channels that
   * aren't ready yet still appear in the grid but with a "준비 중" badge
   * and no Connect button.
   */
  ready: boolean;
  /** Fields the user has to paste during connection. */
  credentialFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password';
    placeholder?: string;
    helpText?: string;
  }>;
  /**
   * Suffix that gets appended to NEXT_PUBLIC_APP_URL to build the webhook
   * URL the user pastes back into the messenger's dev console.
   */
  webhookPath: string;
};

export const CHANNELS: Record<ChannelKind, ChannelDef> = {
  kakao: {
    kind: 'kakao',
    label: 'KakaoTalk Channel',
    description: '한국 환자 대화의 70% 이상 — 카카오톡 비즈니스 채널 (@koreaglowup).',
    brand: 'kakao',
    color: '#FEE500',
    emoji: '💬',
    devConsoleUrl: 'https://developers.kakao.com/console/app',
    ready: true,
    credentialFields: [
      {
        key: 'restApiKey',
        label: 'REST API Key',
        type: 'password',
        placeholder: '카카오 개발자 콘솔의 앱 키 > REST API 키',
        helpText: 'Kakao Developers > 내 애플리케이션 > 앱 설정 > 앱 키 에서 복사',
      },
      {
        key: 'adminKey',
        label: 'Admin Key (선택)',
        type: 'password',
        placeholder: '메시지 발송 권한이 필요한 경우만',
        helpText: '메시지 API · 친구 목록 조회 등 일부 API는 Admin Key 필요',
      },
      {
        key: 'channelPublicId',
        label: '채널 공개 ID',
        type: 'text',
        placeholder: '@koreaglowup',
        helpText: '카카오톡 채널 관리자센터 > 채널 정보 > 검색용 ID',
      },
      // Outbound (CS Message via i 오픈빌더 EventAPI) — fills in once
      // the chatbot is operating.  Without these the inbox can RECEIVE
      // messages but agent replies can't be pushed back to the user's
      // KakaoTalk — they only get stored in KoreaGlowUp DB.
      {
        key: 'botId',
        label: '챗봇 ID (i 오픈빌더)',
        type: 'text',
        placeholder: '6a167ad970e65519fcd37996',
        helpText:
          '카카오 i 오픈빌더 > 봇 선택 > 설정 > 봇 ID 복사. 상담사 답변을 사용자 카톡에 전송할 때 사용.',
      },
      {
        key: 'botEventApiKey',
        label: 'Event API Key (i 오픈빌더, 선택)',
        type: 'password',
        placeholder: '봇 설정 > API 관리에서 발급',
        helpText:
          '카카오 i 오픈빌더 > 봇 > 설정 > API 관리 > Event API 키. 미입력 시 발신은 KoreaGlowUp 인박스에만 저장되고 사용자에게 전달 안 됨.',
      },
    ],
    webhookPath: '/api/webhooks/kakao',
  },
  line: {
    kind: 'line',
    label: 'LINE Official Account',
    description: '일본 · 대만 · 태국 환자 채널. Messaging API + Webhook 기반.',
    brand: 'line',
    color: '#06C755',
    emoji: '💚',
    devConsoleUrl: 'https://developers.line.biz/console/',
    ready: true,
    credentialFields: [
      {
        key: 'channelAccessToken',
        label: 'Channel Access Token',
        type: 'password',
        placeholder: 'Long-lived token (JWT 형태)',
        helpText:
          'LINE Developers Console > Messaging API channel > Messaging API 탭 하단 "Channel access token (long-lived)" Issue 버튼.',
      },
      {
        key: 'channelSecret',
        label: 'Channel Secret',
        type: 'password',
        placeholder: '32자 hex',
        helpText:
          '같은 채널 > Basic settings 탭 상단의 "Channel secret". Webhook 서명 검증에 필수.',
      },
    ],
    webhookPath: '/api/webhooks/line',
  },
  telegram: {
    kind: 'telegram',
    label: 'Telegram Bot',
    description: '러시아 · 중동 · 글로벌 환자. BotFather 토큰으로 즉시 연결.',
    brand: 'telegram',
    color: '#26A5E4',
    emoji: '✈️',
    devConsoleUrl: 'https://t.me/BotFather',
    ready: true,
    credentialFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456:ABC-DEF...',
        helpText:
          '@BotFather에 /newbot 입력 → 봇 이름과 @username 설정 → 발급받은 토큰 (형식: 123456:ABC-DEF...).',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Secret (선택)',
        type: 'password',
        placeholder: '16자 이상 임의 문자열',
        helpText:
          'setWebhook 호출 시 secret_token 파라미터에 같은 값을 넣으면 매 요청 헤더가 검증됩니다. 비워두면 URL 의 channel UUID 가 baseline secret 역할.',
      },
    ],
    webhookPath: '/api/webhooks/telegram',
  },
  whatsapp: {
    kind: 'whatsapp',
    label: 'WhatsApp Business',
    description: '동남아 · 인도 · 중동 환자. Meta Cloud API 필요 (가입 승인 ~3일).',
    brand: 'whatsapp',
    color: '#25D366',
    emoji: '🟢',
    devConsoleUrl: 'https://developers.facebook.com/apps/',
    ready: true,
    credentialFields: [
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        type: 'text',
        placeholder: '숫자만 (예: 123456789012345)',
        helpText:
          'Meta for Developers > 본인 앱 > WhatsApp > API Setup > "From" 항목 아래의 Phone number ID.',
      },
      {
        key: 'accessToken',
        label: 'Permanent Access Token',
        type: 'password',
        placeholder: 'EAAxxxxx... (긴 토큰)',
        helpText:
          '같은 API Setup 페이지의 Temporary 토큰은 24시간 후 만료됩니다. 실서비스용은 Business Manager > 시스템 사용자에서 whatsapp_business_messaging + whatsapp_business_management 권한으로 Permanent 토큰 발급 권장.',
      },
      {
        key: 'wabaId',
        label: 'WhatsApp Business Account ID',
        type: 'text',
        placeholder: '숫자만 (예: 987654321098765)',
        helpText:
          'Meta Business Suite > Settings > Business Assets > WhatsApp Accounts 에서 본인 WABA 선택 시 표시.',
      },
      {
        key: 'verifyToken',
        label: 'Webhook Verify Token',
        type: 'password',
        placeholder: '본인이 정한 임의 16자+ 문자열',
        helpText:
          'Meta Webhook 콘솔의 "Verify token" 입력란과 같은 값을 사용. Verify 클릭 시 GET 핸드셰이크에서 비교됩니다.',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        placeholder: '32자 hex',
        helpText:
          'Meta for Developers > 앱 > Settings > Basic > App secret. 모든 webhook POST 의 x-hub-signature-256 헤더 검증에 사용 (위조 메시지 차단).',
      },
    ],
    webhookPath: '/api/webhooks/whatsapp',
  },
  instagram: {
    kind: 'instagram',
    label: 'Instagram DM',
    description: '글로벌 인플루언서 유입. Instagram 비즈니스 계정 + Facebook 페이지 연결 필요.',
    brand: 'instagram',
    color: '#E4405F',
    emoji: '📷',
    devConsoleUrl: 'https://developers.facebook.com/apps/',
    ready: true,
    credentialFields: [
      {
        key: 'igBusinessAccountId',
        label: 'Instagram Business Account ID',
        type: 'text',
        placeholder: '숫자만 (예: 17841401234567890)',
        helpText:
          'Meta for Developers > 본인 앱 > Instagram > API Setup 의 "Instagram-Scoped Account ID" 또는 Business Manager > Instagram 계정 정보에서 확인.',
      },
      {
        key: 'pageAccessToken',
        label: 'Page Access Token',
        type: 'password',
        placeholder: 'EAA... (긴 토큰)',
        helpText:
          'Facebook Page 에 연결된 Page Access Token. 권한: instagram_basic + instagram_manage_messages + pages_manage_metadata + pages_messaging. 장기 토큰은 Business Manager > 시스템 사용자에서 발급.',
      },
      {
        key: 'verifyToken',
        label: 'Webhook Verify Token',
        type: 'password',
        placeholder: '본인이 정한 임의 16자+ 문자열',
        helpText:
          'Meta Webhook 콘솔의 "Verify token" 입력란과 같은 값을 사용. Verify 클릭 시 GET 핸드셰이크에서 비교됩니다.',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        placeholder: '32자 hex',
        helpText:
          'Meta for Developers > 앱 > Settings > Basic > App secret. webhook POST 의 x-hub-signature-256 헤더 검증에 사용 (위조 메시지 차단).',
      },
    ],
    webhookPath: '/api/webhooks/instagram',
  },
  messenger: {
    kind: 'messenger',
    label: 'Facebook Messenger',
    description: '북미 · 동남아 환자. Facebook 페이지에 메신저 플러그인 활성화.',
    brand: 'facebook',
    color: '#1877F2',
    emoji: '👍',
    devConsoleUrl: 'https://developers.facebook.com/apps/',
    ready: true,
    credentialFields: [
      {
        key: 'pageId',
        label: 'Facebook Page ID',
        type: 'text',
        placeholder: '숫자만 (예: 1234567890)',
        helpText:
          '클리닉 페이지 About 섹션 하단 또는 Meta Business Suite > Settings > Pages 에서 확인.',
      },
      {
        key: 'pageAccessToken',
        label: 'Page Access Token',
        type: 'password',
        placeholder: 'EAA... (긴 토큰)',
        helpText:
          'Meta for Developers > 본인 앱 > Messenger > Settings > "Generate Token" → 페이지 선택 후 발급. 권한: pages_messaging + pages_messaging_subscriptions + pages_manage_metadata + pages_read_engagement. 장기 토큰은 Business Manager 시스템 사용자에서 발급 권장.',
      },
      {
        key: 'verifyToken',
        label: 'Webhook Verify Token',
        type: 'password',
        placeholder: '본인이 정한 임의 16자+ 문자열',
        helpText:
          'Meta Webhook 콘솔의 "Verify token" 입력란과 같은 값을 사용. Verify 클릭 시 GET 핸드셰이크에서 비교됩니다.',
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        placeholder: '32자 hex',
        helpText:
          'Meta for Developers > 앱 > Settings > Basic > App secret (WhatsApp / Instagram 과 같은 값). webhook POST 의 x-hub-signature-256 헤더 검증에 사용.',
      },
    ],
    webhookPath: '/api/webhooks/messenger',
  },
  naver: {
    kind: 'naver',
    label: 'Naver 톡톡',
    description: '네이버 검색 유입 환자. 네이버 톡톡 파트너센터에서 비즈니스 계정 필요.',
    brand: 'naver',
    color: '#03C75A',
    emoji: 'N',
    devConsoleUrl: 'https://partner.talk.naver.com/',
    ready: false,
    credentialFields: [
      { key: 'partnerId', label: 'Partner ID', type: 'text' },
      { key: 'authToken', label: '인증 토큰', type: 'password' },
    ],
    webhookPath: '/api/webhooks/naver',
  },
  wechat: {
    kind: 'wechat',
    label: 'WeChat Official Account',
    description: '중국 본토 환자. WeChat OA 등록 + 베리피케이션 (외국 법인 ~수주).',
    brand: 'wechat',
    color: '#07C160',
    emoji: '💚',
    devConsoleUrl: 'https://mp.weixin.qq.com/',
    ready: true,
    credentialFields: [
      {
        key: 'appId',
        label: 'AppID',
        type: 'text',
        placeholder: 'wxXXXXXXXXXXXXXXXX',
        helpText: 'WeChat OA 관리자 > 설정 > 개발자 정보 > AppID(应用 ID)',
      },
      {
        key: 'appSecret',
        label: 'AppSecret',
        type: 'password',
        placeholder: '32-character hex',
        helpText: '같은 화면의 AppSecret(应用密钥). 메시지 발송 시 액세스 토큰 발급에 사용.',
      },
      {
        key: 'token',
        label: 'Token',
        type: 'password',
        placeholder: 'WeChat 서버 설정에 입력할 임의 문자열',
        helpText: '본인이 임의로 정한 영숫자 3-32자. 같은 값을 WeChat OA의 "서버 구성 > Token"에도 입력해야 webhook 서명이 통과합니다.',
      },
      {
        key: 'encodingAESKey',
        label: 'EncodingAESKey (선택)',
        type: 'password',
        placeholder: '암호화 모드 사용 시에만 입력 (43자)',
        helpText: '평문 모드면 비워두세요. 안전 모드(암호화)로 설정한 경우 WeChat이 자동 생성한 43자 키를 그대로 붙여넣기.',
      },
    ],
    webhookPath: '/api/webhooks/wechat',
  },
};

export const CHANNEL_ORDER: ChannelKind[] = [
  'kakao',
  'line',
  'telegram',
  'whatsapp',
  'instagram',
  'messenger',
  'naver',
  'wechat',
];
