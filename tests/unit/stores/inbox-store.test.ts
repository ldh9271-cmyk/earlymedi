import { describe, expect, it, beforeEach } from 'vitest';
import { useInboxStore } from '@/lib/stores/inbox-store';

describe('inbox store', () => {
  beforeEach(() => {
    useInboxStore.setState({
      selectedConversationId: null,
      channelFilters: [],
      stageFilters: [],
      countryFilters: [],
      unreadOnly: false,
      search: '',
      isAssistantOpen: false,
    });
  });

  it('toggles channel filters idempotently', () => {
    const s = useInboxStore.getState();
    s.toggleChannel('kakao');
    expect(useInboxStore.getState().channelFilters).toEqual(['kakao']);
    s.toggleChannel('kakao');
    expect(useInboxStore.getState().channelFilters).toEqual([]);
    s.toggleChannel('kakao');
    s.toggleChannel('line');
    expect(useInboxStore.getState().channelFilters).toEqual(['kakao', 'line']);
    s.clearChannels();
    expect(useInboxStore.getState().channelFilters).toEqual([]);
  });

  it('toggles stage filters', () => {
    const s = useInboxStore.getState();
    s.toggleStage('lead');
    s.toggleStage('quoted');
    expect(useInboxStore.getState().stageFilters).toEqual(['lead', 'quoted']);
    s.toggleStage('lead');
    expect(useInboxStore.getState().stageFilters).toEqual(['quoted']);
  });

  it('captures search input', () => {
    useInboxStore.getState().setSearch('rhinoplasty');
    expect(useInboxStore.getState().search).toBe('rhinoplasty');
  });
});
