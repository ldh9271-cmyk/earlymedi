/**
 * Public registry of every messenger EarlyMedi can integrate with. Used
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
    description: '한국 환자 대화의 70% 이상 — 카카오톡 비즈니스 채널 (@earlymedi).',
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
        placeholder: '@earlymedi',
        helpText: '카카오톡 채널 관리자센터 > 채널 정보 > 검색용 ID',
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
    ready: false,
    credentialFields: [
      { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password' },
      { key: 'channelSecret', label: 'Channel Secret', type: 'password' },
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
    ready: false,
    credentialFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456:ABC-DEF...',
        helpText: '@BotFather에서 /newbot 명령어로 발급받은 토큰',
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
    devConsoleUrl: 'https://business.facebook.com/wa/manage/',
    ready: false,
    credentialFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' },
      { key: 'accessToken', label: 'Permanent Access Token', type: 'password' },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', type: 'text' },
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
    ready: false,
    credentialFields: [
      { key: 'igBusinessAccountId', label: 'Instagram Business Account ID', type: 'text' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password' },
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
    ready: false,
    credentialFields: [
      { key: 'pageId', label: 'Facebook Page ID', type: 'text' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password' },
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
    ready: false,
    credentialFields: [
      { key: 'appId', label: 'AppID', type: 'text' },
      { key: 'appSecret', label: 'AppSecret', type: 'password' },
      { key: 'token', label: 'Token', type: 'password' },
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
