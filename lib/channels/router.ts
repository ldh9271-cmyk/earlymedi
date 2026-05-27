import 'server-only';
import { BaseMockAdapter } from './base-mock-adapter';
import { KakaoAdapter } from './kakao-adapter';
import type { ChannelAdapter, ChannelKind, NormalizedOutboundMessage, SendResult } from './types';
export { CHANNEL_DISPLAY, ALL_CHANNEL_KINDS } from './types';

/**
 * The single entry point used by the inbox to send messages, regardless of
 * channel. The router resolves the adapter by `kind` and delegates.
 *
 * Real adapters wired in: kakao (via i 오픈빌더 EventAPI). Other channels
 * still use BaseMockAdapter — agent replies get stored in EarlyMedi DB but
 * don't push back to the user's messenger. Replace each one with a real
 * impl as the corresponding platform's API access is set up.
 */
const adapters: Record<ChannelKind, ChannelAdapter> = {
  kakao: new KakaoAdapter(),
  instagram: new BaseMockAdapter('instagram'),
  line: new BaseMockAdapter('line'),
  whatsapp: new BaseMockAdapter('whatsapp'),
  wechat: new BaseMockAdapter('wechat'),
  telegram: new BaseMockAdapter('telegram'),
  messenger: new BaseMockAdapter('messenger'),
  naver: new BaseMockAdapter('naver'),
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

