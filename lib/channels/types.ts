/**
 * Channel-adapter shared types.
 *
 * Every external messaging platform we integrate (Phase 2 ships mocks; Phase
 * 6+ wires real APIs) implements `ChannelAdapter`. The adapter is the only
 * place that knows the platform's quirks — everything else above (inbox UI,
 * routing, AI suggestions) works against this normalized surface.
 */

export type ChannelKind =
  | 'kakao'
  | 'instagram'
  | 'line'
  | 'whatsapp'
  | 'wechat'
  | 'telegram'
  | 'messenger'
  | 'naver'
  | 'sms'
  | 'email'
  | 'web';

export type NormalizedAttachment = {
  path: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type NormalizedInboundMessage = {
  channelKind: ChannelKind;
  externalAccountId: string; // our side (page id / channel id)
  externalThreadId: string;
  externalMessageId: string;
  contact: {
    externalId: string;
    displayName?: string;
    locale?: string;
    countryCode?: string;
    avatarUrl?: string;
  };
  contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'voice_note';
  body: string;
  bodyLocale?: string;
  attachments?: NormalizedAttachment[];
  sentAt: Date;
  raw?: Record<string, unknown>;
};

export type NormalizedOutboundMessage = {
  conversationId: string;
  channelKind: ChannelKind;
  externalAccountId: string;
  externalThreadId: string;
  contact: {
    externalId: string;
  };
  contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template';
  body: string;
  templateKey?: string;
  attachments?: NormalizedAttachment[];
};

export type SendResult =
  | { ok: true; externalMessageId: string; deliveredAt?: Date }
  | { ok: false; error: string; retryAfterMs?: number };

/**
 * Channel adapter contract. Implementations live under
 * `lib/channels/<kind>/adapter.ts`. The router (`lib/channels/router.ts`) is
 * the single entry point used by the inbox.
 */
export interface ChannelAdapter {
  readonly kind: ChannelKind;
  /** Send a message and return platform-native id. */
  send(msg: NormalizedOutboundMessage): Promise<SendResult>;
  /** Parse a webhook payload into one or more normalized inbound messages. */
  parseWebhook(payload: unknown, headers: Record<string, string>): NormalizedInboundMessage[];
  /** Optional: verify the webhook signature. */
  verifyWebhook?(payload: unknown, headers: Record<string, string>): boolean;
  /** Optional: fetch an attachment to a Supabase Storage path. */
  fetchAttachment?(externalUrl: string): Promise<NormalizedAttachment>;
}

/**
 * Client-safe metadata (label/emoji/color). Lives in types.ts so that React
 * Client Components can import without dragging in `server-only` from router.ts.
 *
 * `brandColor` is the tile background used by ChannelBadge / inbox UI; it
 * matches the registry's tile-background and keeps the brand SVG glyph
 * readable. `emoji` stays as a text-mode fallback for places that don't
 * want SVG (audit log diffs, plain-text notifications, etc.).
 */
export const CHANNEL_DISPLAY: Record<
  ChannelKind,
  { label: string; emoji: string; colorClass: string; brandColor: string }
> = {
  kakao: { label: 'KakaoTalk', emoji: '💬', colorClass: 'bg-yellow-100 text-yellow-900', brandColor: '#FEE500' },
  instagram: { label: 'Instagram', emoji: '📷', colorClass: 'bg-pink-100 text-pink-900', brandColor: '#E4405F' },
  line: { label: 'LINE', emoji: '💚', colorClass: 'bg-green-100 text-green-900', brandColor: '#06C755' },
  whatsapp: { label: 'WhatsApp', emoji: '🟢', colorClass: 'bg-emerald-100 text-emerald-900', brandColor: '#25D366' },
  wechat: { label: 'WeChat', emoji: '🐉', colorClass: 'bg-lime-100 text-lime-900', brandColor: '#07C160' },
  telegram: { label: 'Telegram', emoji: '✈️', colorClass: 'bg-sky-100 text-sky-900', brandColor: '#26A5E4' },
  messenger: { label: 'Facebook', emoji: '💙', colorClass: 'bg-blue-100 text-blue-900', brandColor: '#1877F2' },
  naver: { label: 'Naver 톡톡', emoji: 'N', colorClass: 'bg-emerald-100 text-emerald-900', brandColor: '#03C75A' },
  sms: { label: 'SMS', emoji: '✉️', colorClass: 'bg-slate-100 text-slate-900', brandColor: '#64748B' },
  email: { label: 'Email', emoji: '📧', colorClass: 'bg-violet-100 text-violet-900', brandColor: '#7C3AED' },
  web: { label: 'Web Chat', emoji: '🌐', colorClass: 'bg-indigo-100 text-indigo-900', brandColor: '#6366F1' },
};

export const ALL_CHANNEL_KINDS: readonly ChannelKind[] = Object.keys(CHANNEL_DISPLAY) as ChannelKind[];
