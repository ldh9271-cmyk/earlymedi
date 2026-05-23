import type { ChannelAdapter, ChannelKind, NormalizedInboundMessage, NormalizedOutboundMessage, SendResult } from './types';

/**
 * Base mock adapter. Each Phase-2 channel inherits this with just the
 * `kind` set; Phase 6+ replaces them with real-API implementations.
 *
 * Mock behavior:
 *   - `send` succeeds after a randomized 80–250ms "network" delay and
 *     returns a synthetic externalMessageId.
 *   - `parseWebhook` is unused (the inbox seeds dummy threads instead).
 */
export class BaseMockAdapter implements ChannelAdapter {
  constructor(public readonly kind: ChannelKind) {}

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    const delay = 80 + Math.random() * 170;
    await new Promise((r) => setTimeout(r, delay));
    return {
      ok: true,
      externalMessageId: `mock_${this.kind}_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`,
      deliveredAt: new Date(Date.now() + 1_000),
      ...(msg.contentType === 'template' ? { templateKey: msg.templateKey } : {}),
    } as SendResult;
  }

  parseWebhook(_payload: unknown, _headers: Record<string, string>): NormalizedInboundMessage[] {
    return [];
  }
}
