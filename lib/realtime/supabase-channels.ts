'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

/**
 * Hook: subscribes to Realtime updates for an org's inbox.
 *
 * Server emits row-level changes from `messages` and `conversations` via
 * Supabase Realtime (RLS still applies). We invalidate the inbox list and
 * the open conversation's detail, and surface a toast + browser
 * notification for new inbound messages when the tab is hidden.
 *
 * Phase 6+ may replace the polling fallback in `conversation-list.tsx`
 * with a pure Realtime-driven feed; for now both paths cohabit.
 */
export function useInboxRealtime(organizationId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return; // Supabase not configured — skip realtime
    const channel = supabase
      .channel(`em-inbox-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['inbox'] });
          const next = payload.new as { conversation_id?: string; direction?: string; body?: string } | null;
          if (next?.conversation_id) {
            queryClient.invalidateQueries({ queryKey: ['conversation', next.conversation_id] });
          }
          if (next?.direction === 'inbound') {
            const preview = next.body?.slice(0, 80) ?? '새 메시지';
            toast('📨 새 메시지', { description: preview });
            if (typeof window !== 'undefined' && document.visibilityState === 'hidden') {
              tryBrowserNotification('KoreaGlowUp · 새 메시지', preview);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `organization_id=eq.${organizationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox'] });
          window.dispatchEvent(new Event('em:inbox:refresh'));
        },
      )
      .subscribe();

    return (): void => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}

function tryBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
}

/** Hook: ask for browser-notification permission once per session. */
export function useBrowserNotificationConsent(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    if (Notification.permission === 'default') {
      const t = window.setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 1500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);
}
