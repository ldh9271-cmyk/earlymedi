'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Sparkles } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setAssistantOpen, isAssistantOpen } = useInboxStore();
  const queryClient = useQueryClient();

  const { data: quickReplies } = useQuery({
    queryKey: ['inbox', 'quick-replies'],
    queryFn: async () => {
      const res = await fetch('/api/agency/inbox/quick-replies');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: QuickReply[] };
      return json.data;
    },
  });

  const sendMut = useMutation({
    mutationFn: async (payload: { body: string }) => {
      const res = await fetch(`/api/agency/inbox/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: payload.body, bodyLocale: 'ko' }),
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
    <div className="space-y-2 border-t bg-background p-3">
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

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="답변을 입력하세요. ⌘Enter 전송 · /<단축어>+Space 빠른 답변 · ⌘. AI 어시스턴트"
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
