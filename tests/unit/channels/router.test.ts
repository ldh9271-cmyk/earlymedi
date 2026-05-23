import { describe, expect, it } from 'vitest';
import { ALL_CHANNEL_KINDS, CHANNEL_DISPLAY, getAdapter, sendViaChannel } from '@/lib/channels/router';

describe('channels router', () => {
  it('exposes all 10 channel kinds', () => {
    expect(ALL_CHANNEL_KINDS).toEqual([
      'kakao',
      'instagram',
      'line',
      'whatsapp',
      'wechat',
      'telegram',
      'messenger',
      'sms',
      'email',
      'web',
    ]);
  });

  it('provides a display entry for every kind', () => {
    for (const k of ALL_CHANNEL_KINDS) {
      expect(CHANNEL_DISPLAY[k]).toBeDefined();
      expect(CHANNEL_DISPLAY[k].label.length).toBeGreaterThan(0);
    }
  });

  it('returns a mock adapter with matching kind for each channel', () => {
    for (const k of ALL_CHANNEL_KINDS) {
      expect(getAdapter(k).kind).toBe(k);
    }
  });

  it('mock send returns ok and a synthetic external id', async () => {
    const result = await sendViaChannel({
      conversationId: 'conv_test',
      channelKind: 'kakao',
      externalAccountId: 'page_demo',
      externalThreadId: 'thread_demo',
      contact: { externalId: 'user_demo' },
      contentType: 'text',
      body: '테스트',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.externalMessageId).toMatch(/^mock_kakao_/);
    }
  });
});
