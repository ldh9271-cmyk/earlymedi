'use client';

import { useQuery } from '@tanstack/react-query';
import { Globe2, Languages, Sparkles, Tag, User2 } from 'lucide-react';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { useInboxStore } from '@/lib/stores/inbox-store';
import type { ChannelKind } from '@/lib/channels/types';

type Detail = {
  conversation: {
    id: string;
    channelKind: ChannelKind;
    contactDisplayName: string | null;
    contactCountryCode: string | null;
    contactLocale: string | null;
    stage: string;
    priority: string;
    subject: string | null;
    summary: string | null;
    aiIntentClass: string | null;
    tags: string[];
  };
};

// Country-specific greeting / etiquette hints displayed in the panel.
const COUNTRY_GUIDE: Record<string, string> = {
  CN: '🇨🇳 중국: 위챗·QR 결제 선호. 가격에 매우 민감. "您好" 인사부터.',
  JP: '🇯🇵 일본: 정중한 경어 + 공식 견적서. 항공권 + 호텔 패키지 선호.',
  AE: '🇦🇪 UAE: "السلام عليكم" 인사. 할랄 식단·기도시간 고려. 동반 가족 다수.',
  RU: '🇷🇺 러시아: 키릴 문자·VAT 면세 안내. 모스크바 시간대 14시 이전 응답 권장.',
  US: '🇺🇸 미국: 명확한 SLA + 보험 청구용 영문 영수증 미리 안내.',
  VN: '🇻🇳 베트남: 가족·통역 동반 다수. 가격 협상 여지 안내 가능.',
  TH: '🇹🇭 태국: K-팝·K-뷰티 관련 패키지 인기. 인스타그램 채널 적극 활용.',
  SG: '🇸🇬 싱가포르: 영어 + 중국어 병행. 회복호텔 5성급 선호.',
  KR: '🇰🇷 국내: KR 발신은 외국인등록증 보유자/거주자 가능성 ─ 우선 신원 확인.',
};

export function ContextPanel(): JSX.Element {
  const { selectedConversationId } = useInboxStore();
  const { data } = useQuery({
    queryKey: ['conversation', selectedConversationId],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const res = await fetch(`/api/agency/inbox/${selectedConversationId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Detail };
      return json.data;
    },
  });

  if (!selectedConversationId || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
        대화를 선택하면 환자 컨텍스트가 표시됩니다.
      </div>
    );
  }

  const c = data.conversation;
  const guide = c.contactCountryCode ? COUNTRY_GUIDE[c.contactCountryCode] : null;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User2 className="h-3.5 w-3.5" /> 컨택트
          </h3>
          <div className="rounded-lg border bg-white p-3 text-sm">
            <div className="font-semibold">{c.contactDisplayName ?? '(이름 없음)'}</div>
            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{c.contactCountryCode ?? '—'}</span>
              <span>·</span>
              <span>{c.contactLocale ?? '—'}</span>
              <span>·</span>
              <span>{c.channelKind}</span>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-dashed py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              disabled
              title="Phase 4에서 환자 CRM 자동 매칭"
            >
              + 환자 CRM에 등록 (Phase 4)
            </button>
          </div>
        </section>

        {c.aiIntentClass || c.summary ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> AI 분석
            </h3>
            <div className="space-y-1.5 rounded-lg border bg-hospitality-50/50 p-3 text-xs">
              {c.aiIntentClass ? (
                <div>
                  <span className="text-muted-foreground">의도: </span>
                  <span className="font-medium">{c.aiIntentClass.replace(/_/g, ' ')}</span>
                </div>
              ) : null}
              {c.summary ? (
                <div>
                  <span className="text-muted-foreground">요약: </span>
                  <span>{c.summary}</span>
                </div>
              ) : null}
              <p className="pt-2 text-[11px] text-muted-foreground">
                * 풀 AI 답변 추천(3종 톤) · 자동 번역 · 감정/리스크 분석은 Phase 3에서 활성화.
              </p>
            </div>
          </section>
        ) : null}

        {c.tags.length > 0 ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> 태그
            </h3>
            <div className="flex flex-wrap gap-1">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {guide ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" /> 국가별 응대 가이드
            </h3>
            <div className="rounded-lg border bg-care-50/50 p-3 text-xs leading-relaxed">{guide}</div>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> 의료 전문용어 사전
          </h3>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            병원별 alias 학습 · 다국어 글로서리(Phase 3 활성화)
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
