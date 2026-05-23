import 'server-only';
import { BaseMockAdapter } from './base-mock-adapter';
import type { ChannelAdapter, ChannelKind, NormalizedOutboundMessage, SendResult } from './types';
export { CHANNEL_DISPLAY, ALL_CHANNEL_KINDS } from './types';

/**
 * The single entry point used by the inbox to send messages, regardless of
 * channel. The router resolves the adapter by `kind` and delegates.
 *
 * In Phase 2 every channel uses BaseMockAdapter. Phase 6+ swaps each entry
 * with the real implementation.
 */
const adapters: Record<ChannelKind, ChannelAdapter> = {
  kakao: new BaseMockAdapter('kakao'),
  instagram: new BaseMockAdapter('instagram'),
  line: new BaseMockAdapter('line'),
  whatsapp: new BaseMockAdapter('whatsapp'),
  wechat: new BaseMockAdapter('wechat'),
  telegram: new BaseMockAdapter('telegram'),
  messenger: new BaseMockAdapter('messenger'),
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

