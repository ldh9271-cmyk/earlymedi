'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Sparkles, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { useInboxStore } from '@/lib/stores/inbox-store';

type QuickReply = {
  id: string;
  shortcut: string;
  title: string;
  bodyByLocale: Record<string, string>;
  categoryKey: string | null;
};

export function Composer({
  conversationId,
  contactLocale,
}: {
  conversationId: string;
  contactLocale: string | null;
}): JSX.Element {
  const [text, setText] = useState('');
  // AI 추천 답변 — expanded by default so the agent sees all 3–5 tones
  // the moment they open a conversation. Toggleable to claw back vertical
  // space when the agent wants to focus on a long inbound message.
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setAssistantOpen, isAssistantOpen, autoTranslate } = useInboxStore();
  const queryClient = useQueryClient();

  // AI translation makes sense only when the agent's language differs
  // from the patient's. Use the global autoTranslate toggle from the
  // header so the composer + header stay in sync.
  const shouldOfferTranslation = !!(contactLocale && !contactLocale.startsWith('ko'));
  const translateOn = shouldOfferTranslation && autoTranslate;

  const { data: quickReplies } = useQuery({
    queryKey: ['inbox', 'quick-replies'],
    queryFn: async () => {
      const res = await fetch('/api/agency/inbox/quick-replies');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: QuickReply[] };
      return json.data;
    },
  });

  // AI suggested replies — 3 different tones (concise / friendly / luxury).
  // Refetched whenever the conversation changes; surfaced as clickable
  // chips below the textarea so the agent can drop one into the box.
  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } =
    useQuery({
      queryKey: ['inbox', 'suggested-replies', conversationId],
      queryFn: async () => {
        const res = await fetch(`/api/agency/inbox/${conversationId}/suggested-replies?outputLocale=ko`);
        if (!res.ok) return [] as Array<{ tone: string; label: string; text: string }>;
        const json = (await res.json()) as {
          data: { suggestions: Array<{ tone: string; label: string; text: string }> };
        };
        return json.data.suggestions;
      },
      // Don't auto-refetch; agent clicks "다시 추천" to refresh.
      staleTime: 5 * 60 * 1000,
      retry: 0,
    });

  const sendMut = useMutation({
    mutationFn: async (payload: { body: string }) => {
      const res = await fetch(`/api/agency/inbox/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: payload.body,
          bodyLocale: 'ko',
          translateBeforeSend: translateOn,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return (await res.json()) as { data: { id: string; status: string } };
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Quick-reply expansion: typing "/<shortcut> " expands to body for the contact's locale
  useEffect(() => {
    if (!quickReplies) return;
    const match = text.match(/^\/([^\s]+)\s$/);
    if (!match) return;
    const found = quickReplies.find((q) => q.shortcut === `/${match[1]}`);
    if (!found) return;
    const localeKey = contactLocale ?? 'ko';
    const body = found.bodyByLocale[localeKey] ?? found.bodyByLocale.ko ?? found.bodyByLocale.en;
    if (body) setText(body);
  }, [text, quickReplies, contactLocale]);

  // Keyboard shortcuts: ⌘Enter send, ⌘/ open quick-reply picker (future), ⌘. open assistant
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setAssistantOpen(!isAssistantOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAssistantOpen, setAssistantOpen]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (text.trim()) sendMut.mutate({ body: text.trim() });
    }
  }

  return (
    <div className="space-y-1.5 border-t bg-background px-3 py-2">
      {quickReplies && quickReplies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
              onClick={() => {
                const body =
                  q.bodyByLocale[contactLocale ?? 'ko'] ?? q.bodyByLocale.ko ?? q.bodyByLocale.en;
                if (body) setText(body);
                textareaRef.current?.focus();
              }}
            >
              {q.shortcut} · {q.title}
            </button>
          ))}
        </div>
      ) : null}

      {/* AI suggested replies — expanded by default, 3–5 tone cards.
          Clicking a card drops it into the textarea but keeps the panel
          open so the agent can still A/B between tones. The chevron
          collapses for vertical-space relief when needed. */}
      {suggestionsLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Wand2 className="h-3 w-3 animate-pulse text-hospitality-500" />
          AI가 답변을 생각 중…
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSuggestionsExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-md bg-hospitality-50/60 px-2.5 py-1 text-[11px] font-medium text-hospitality-800 transition hover:bg-hospitality-100/60"
            title={suggestionsExpanded ? '접기' : 'AI 추천 답변 보기'}
          >
            <span className="flex items-center gap-1.5">
              <Wand2 className="h-3 w-3" />
              AI 추천 답변 {suggestions.length}개
            </span>
            {/* Chevron points the direction the panel will move when
                clicked: ChevronUp when expanded (collapse upward),
                ChevronDown when collapsed (expand downward). */}
            {suggestionsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {suggestionsExpanded ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-end text-[10px] uppercase tracking-wider text-muted-foreground">
                <button
                  type="button"
                  onClick={() => refetchSuggestions()}
                  className="text-muted-foreground hover:text-foreground"
                  title="다시 추천"
                >
                  ⟳ 다시 추천
                </button>
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.tone}
                  type="button"
                  onClick={() => {
                    setText(s.text);
                    // Keep the panel open so the agent can compare tones
                    // even after dropping one in. They can edit then send
                    // (or pick a different tone) without re-expanding.
                    textareaRef.current?.focus();
                  }}
                  className="group flex w-full items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-hospitality-300 hover:bg-hospitality-50"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-hospitality-100 px-1.5 py-0.5 text-[9px] font-bold text-hospitality-800">
                    {s.label}
                  </span>
                  <span className="line-clamp-2 text-foreground/90">{s.text}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            translateOn
              ? `한국어로 입력하세요. 발송 시 ${contactLocale}로 자동 번역 · ⌘Enter 전송`
              : '답변을 입력하세요. ⌘Enter 전송 · /<단축어>+Space 빠른 답변 · ⌘. AI 어시스턴트'
          }
          className="min-h-[44px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAssistantOpen(!isAssistantOpen)}
          title="AI 어시스턴트 (⌘.)"
        >
          <Sparkles className="h-4 w-4 text-hospitality-500" />
        </Button>
        <Button
          variant="brand"
          size="icon"
          onClick={() => text.trim() && sendMut.mutate({ body: text.trim() })}
          disabled={!text.trim() || sendMut.isPending}
          title="전송 (⌘Enter)"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
