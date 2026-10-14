'use client';

/**
 * 'AI 상담' · '상담원' 버튼 한 쌍 (2026-10-14) — 모든 카테고리 상세 페이지에 같은 모양으로 넣는다.
 *
 *  AI 상담  → 같은 페이지의 채팅 위젯(chat-bubble.tsx)을 AI 탭으로 열고 '<이름>에 대해 알려 주세요'를 자동 전송
 *  상담원   → 위젯을 상담원 탭으로 열고 그 업체·상품 전용 방을 연다(비회원이면 위젯이 로그인 안내)
 *
 * 위젯은 window 이벤트 'gu:open-chat' 을 듣는다. 위젯이 없는 페이지(예: /glowup/courses)에서는
 * AI 는 /ai-consult, 상담원은 /me?chat=<target> 으로 이동한다.
 *
 * target: 'listing:<slug>' (상품) 또는 'topic:<종류>:<id>' (lib/chat/topic-room.ts 의 키)
 */
import type { CSSProperties } from 'react';

type Props = {
  locale: string;
  aiLabel: string;
  humanLabel: string;
  /** AI 탭에 자동으로 보낼 질문 */
  aiPrompt: string;
  target: string;
  /** 'card' = 카드 안 두 칸 버튼, 'compact' = 모바일 하단 바용 작은 아이콘 버튼 */
  variant?: 'card' | 'compact';
  style?: CSSProperties;
};

function openChat(detail: { mode: 'ai' | 'human'; target?: string; prompt?: string; context?: string }, locale: string): void {
  const w = window as unknown as { __guChatReady?: boolean };
  if (w.__guChatReady) {
    window.dispatchEvent(new CustomEvent('gu:open-chat', { detail }));
    return;
  }
  window.location.href = detail.mode === 'ai'
    ? `/${locale}/ai-consult`
    : `/${locale}/me?chat=${encodeURIComponent(detail.target ?? 'support')}`;
}

export default function ConsultButtons({ locale, aiLabel, humanLabel, aiPrompt, target, variant = 'card', style }: Props): JSX.Element {
  // context = 같은 대상 키 — AI 상담 서버가 이 업체를 근거 맨 앞에 두고 답한다(/api/ai/chat contextFocus)
  const onAi = (): void => openChat({ mode: 'ai', prompt: aiPrompt, context: target }, locale);
  const onHuman = (): void => openChat({ mode: 'human', target }, locale);

  if (variant === 'compact') {
    const btn: CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, flexShrink: 0,
      border: '1px solid #ffd7de', background: '#fff5f7', borderRadius: 12, fontSize: 18, cursor: 'pointer', padding: 0,
    };
    return (
      <>
        <button type="button" onClick={onAi} aria-label={aiLabel} title={aiLabel} style={btn}>✨</button>
        <button type="button" onClick={onHuman} aria-label={humanLabel} title={humanLabel} style={btn}>💬</button>
      </>
    );
  }

  const base: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, ...style }}>
      <button type="button" onClick={onAi} style={{ ...base, background: '#fff', color: '#222', border: '1px solid #222' }}>
        <span aria-hidden>✨</span>{aiLabel}
      </button>
      <button type="button" onClick={onHuman} style={{ ...base, background: '#fff5f7', color: '#c81e42', border: '1px solid #ffd7de' }}>
        <span aria-hidden>💬</span>{humanLabel}
      </button>
    </div>
  );
}
