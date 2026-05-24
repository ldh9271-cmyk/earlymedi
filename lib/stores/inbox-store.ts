'use client';

import { create } from 'zustand';
import type { ChannelKind } from '@/lib/channels/types';

export type InboxStageFilter = 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived';

type InboxState = {
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;

  channelFilters: ChannelKind[];
  toggleChannel: (kind: ChannelKind) => void;
  clearChannels: () => void;

  stageFilters: InboxStageFilter[];
  toggleStage: (stage: InboxStageFilter) => void;

  countryFilters: string[];
  toggleCountry: (code: string) => void;

  unreadOnly: boolean;
  setUnreadOnly: (v: boolean) => void;

  search: string;
  setSearch: (v: string) => void;

  // AI assistant pane
  isAssistantOpen: boolean;
  setAssistantOpen: (v: boolean) => void;

  // Global AI auto-translation toggle. When ON, agent-typed Korean
  // messages get auto-translated into the patient's contactLocale before
  // delivery. Persisted to localStorage so the agent's preference
  // survives reloads.
  autoTranslate: boolean;
  setAutoTranslate: (v: boolean) => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),

  channelFilters: [],
  toggleChannel: (kind) =>
    set((s) => ({
      channelFilters: s.channelFilters.includes(kind)
        ? s.channelFilters.filter((k) => k !== kind)
        : [...s.channelFilters, kind],
    })),
  clearChannels: () => set({ channelFilters: [] }),

  stageFilters: [],
  toggleStage: (stage) =>
    set((s) => ({
      stageFilters: s.stageFilters.includes(stage)
        ? s.stageFilters.filter((x) => x !== stage)
        : [...s.stageFilters, stage],
    })),

  countryFilters: [],
  toggleCountry: (code) =>
    set((s) => ({
      countryFilters: s.countryFilters.includes(code)
        ? s.countryFilters.filter((x) => x !== code)
        : [...s.countryFilters, code],
    })),

  unreadOnly: false,
  setUnreadOnly: (v) => set({ unreadOnly: v }),

  search: '',
  setSearch: (v) => set({ search: v }),

  isAssistantOpen: false,
  setAssistantOpen: (v) => set({ isAssistantOpen: v }),

  autoTranslate:
    typeof window !== 'undefined'
      ? (window.localStorage.getItem('em.autoTranslate') ?? 'true') !== 'false'
      : true,
  setAutoTranslate: (v) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('em.autoTranslate', v ? 'true' : 'false');
    }
    set({ autoTranslate: v });
  },
}));
