'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { useInboxStore } from '@/lib/stores/inbox-store';

type Tone = 'concise' | 'friendly' | 'luxury';

const TONES: Array<{ key: Tone; label: string; color: 'brand' | 'hospitality' | 'care' }> = [
  { key: 'concise', label: '간결', color: 'brand' },
  { key: 'friendly', label: '친절', color: 'care' },
  { key: 'luxury', label: '럭셔리', color: 'hospitality' },
];

export function AiAssistantPanel(): JSX.Element | null {
  const { selectedConversationId, isAssistantOpen, setAssistantOpen } = useInboxStore();
  const [suggestions, setSuggestions] = useState<Record<Tone, string>>({
    concise: '',
    friendly: '',
    luxury: '',
  });
  const [streamingTone, setStreamingTone] = useState<Tone | null>(null);
  const queryClient = useQueryClient();

  async function streamTone(tone: Tone): Promise<void> {
    if (!selectedConversationId) return;
    setStreamingTone(tone);
    setSuggestions((s) => ({ ...s, [tone]: '' }));
    try {
      const res = await fetch('/api/ai/concierge-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId, tone, outputLocale: 'ko' }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setSuggestions((s) => ({ ...s, [tone]: acc }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '답변 생성 실패');
    } finally {
      setStreamingTone(null);
    }
  }

  const classifyMut = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error('no conversation');
      const res = await fetch('/api/ai/classify-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId, persist: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
    onSuccess: () => {
      toast.success('의도·감정·리스크 분석 완료');
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const translateAllMut = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error('no conversation');
      // Phase 4 expansion: bulk-translate all inbound messages of the thread.
      // Phase 3 single-shot: translate the *last inbound* via the existing API.
      const detailRes = await fetch(`/api/agency/inbox/${selectedConversationId}`);
      if (!detailRes.ok) throw new Error('detail_failed');
      const detail = (await detailRes.json()) as {
        data: { messages: Array<{ id: string; direction: string; translationKo: string | null }> };
      };
      const target = [...detail.data.messages].reverse().find((m) => m.direction === 'inbound' && !m.translationKo);
      if (!target) return { skipped: true };
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: target.id, targetLocale: 'ko', persist: true }),
      });
      if (!res.ok) throw new Error('translate_failed');
      return await res.json();
    },
    onSuccess: () => {
      toast.success('번역이 메시지에 저장되었습니다');
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyAndDraft(tone: Tone): Promise<void> {
    const text = suggestions[tone];
    if (!text) return;
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success(`"${tone}" 톤 답변을 클립보드에 복사했습니다`);
  }

  if (!isAssistantOpen) return null;

  return (
    <aside className="fixed bottom-0 right-0 top-16 z-40 flex w-full flex-col border-l bg-white shadow-xl md:w-[420px]">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-hospitality-500" />
          AI 컨시어지 어시스턴트
        </div>
        <button
          type="button"
          onClick={() => setAssistantOpen(false)}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-5 overflow-y-auto p-4">
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            빠른 작업
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedConversationId || classifyMut.isPending}
              onClick={() => classifyMut.mutate()}
            >
              <Wand2 className="mr-1 h-3.5 w-3.5" /> 의도 · 감정 분석
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedConversationId || translateAllMut.isPending}
              onClick={() => translateAllMut.mutate()}
            >
              <Languages className="mr-1 h-3.5 w-3.5" /> 마지막 메시지 → 한국어
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            답변 추천 (3종 톤 스트리밍)
          </div>
          <div className="space-y-3">
            {TONES.map((t) => (
              <div key={t.key} className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold">{t.label}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={t.color}
                      disabled={!selectedConversationId || streamingTone === t.key}
                      onClick={() => streamTone(t.key)}
                    >
                      {streamingTone === t.key ? '생성 중…' : '생성'}
                    </Button>
                    {suggestions[t.key] ? (
                      <Button size="sm" variant="outline" onClick={() => copyAndDraft(t.key)}>
                        복사
                      </Button>
                    ) : null}
                  </div>
                </div>
                {suggestions[t.key] ? (
                  <div className="whitespace-pre-wrap rounded-md bg-background p-2 text-sm leading-relaxed">
                    {suggestions[t.key]}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    생성을 누르면 환자 컨텍스트·국가별 가이드·글로서리를 반영해 작성합니다.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          ⌘. 으로 토글 · 응답은 PII 가명화 후 모델에 전송됩니다.
        </section>
      </div>
    </aside>
  );
}
