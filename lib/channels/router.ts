import 'server-only';
import { BaseMockAdapter } from './base-mock-adapter';
import { KakaoAdapter } from './kakao-adapter';
import { LineAdapter } from './line-adapter';
import { TelegramAdapter } from './telegram-adapter';
import { WhatsAppAdapter } from './whatsapp-adapter';
import { InstagramAdapter } from './instagram-adapter';
import { MessengerAdapter } from './messenger-adapter';
import { NaverAdapter } from './naver-adapter';
import type { ChannelAdapter, ChannelKind, NormalizedOutboundMessage, SendResult } from './types';
export { CHANNEL_DISPLAY, ALL_CHANNEL_KINDS } from './types';

/**
 * The single entry point used by the inbox to send messages, regardless of
 * channel. The router resolves the adapter by `kind` and delegates.
 *
 * Real adapters wired in (all 8 messenger channels):
 *   - kakao     (via i 오픈빌더 EventAPI)
 *   - line      (via Messaging API Push)
 *   - telegram  (via Bot API sendMessage)
 *   - whatsapp  (via Meta Cloud API + 24h CS window)
 *   - instagram (via Meta Graph API + 24h CMW)
 *   - messenger (via Meta Graph API + 24h CMW)
 *   - naver     (via Naver TalkTalk Chatbot API — no 24h window)
 *   - wechat    (via WeChat OA API)
 * Non-messenger sinks (sms / email / web) still use BaseMockAdapter —
 * they store outbound in KoreaGlowUp DB; carrier integration is a
 * future step.
 */
const adapters: Record<ChannelKind, ChannelAdapter> = {
  kakao: new KakaoAdapter(),
  line: new LineAdapter(),
  telegram: new TelegramAdapter(),
  whatsapp: new WhatsAppAdapter(),
  instagram: new InstagramAdapter(),
  messenger: new MessengerAdapter(),
  naver: new NaverAdapter(),
  wechat: new BaseMockAdapter('wechat'),
  sms: new BaseMockAdapter('sms'),
  email: new BaseMockAdapter('email'),
  web: new BaseMockAdapter('web'),
};

export function getAdapter(kind: ChannelKind): ChannelAdapter {
  return adapters[kind];
}

export async function sendViaChannel(msg: NormalizedOutboundMessage): Promise<SendResult> {
  return await getAdapter(msg.channelKind).send(msg);
}

