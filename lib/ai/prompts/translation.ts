import type { AiTextMessage } from '../types';

export type ConversationContextMsg = {
  direction: 'inbound' | 'outbound';
  body: string;
  bodyLocale?: string | null;
  /** Korean rendering of an inbound message, if previously translated. */
  translationKo?: string | null;
};

export function buildTranslationMessages(input: {
  text: string;
  sourceLocale?: string;
  targetLocale: string;
  glossarySnippet?: string;
  domain?: 'medical' | 'travel' | 'general';
  /** Most recent N messages on this conversation (oldest first). The AI
   *  uses them to keep terminology, tone and named-entity references
   *  consistent — e.g. once the agent calls the procedure "코 성형",
   *  later inbound translations should keep saying 코 성형 (not
   *  rhinoplasty). Pass at most ~6 to keep the prompt cheap. */
  conversationContext?: ConversationContextMsg[];
  /** Optional caller-side metadata that doesn't fit in messages — e.g.
   *  the patient's display name + country/locale so honorifics and
   *  cultural register can be tuned. */
  contactHint?: {
    displayName?: string | null;
    countryCode?: string | null;
    locale?: string | null;
  };
}): { system: string; messages: AiTextMessage[] } {
  const domain = input.domain ?? 'medical';

  const contextBlock = (input.conversationContext ?? [])
    .filter((m) => m.body && m.body.trim().length > 0)
    .slice(-6)
    .map((m, i) => {
      const role = m.direction === 'inbound' ? '환자' : '상담사';
      const lang = m.bodyLocale ? ` (${m.bodyLocale})` : '';
      const lines = [`${i + 1}. ${role}${lang}: ${m.body.trim()}`];
      if (m.direction === 'inbound' && m.translationKo && m.translationKo !== m.body) {
        lines.push(`   ↳ 한국어로는: ${m.translationKo.trim()}`);
      }
      return lines.join('\n');
    })
    .join('\n');

  const contactBlock = input.contactHint
    ? [
        input.contactHint.displayName ? `이름: ${input.contactHint.displayName}` : null,
        input.contactHint.countryCode ? `국가: ${input.contactHint.countryCode}` : null,
        input.contactHint.locale ? `사용 언어: ${input.contactHint.locale}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const system = `당신은 한국 의료관광 컨시어지를 위한 전문 통역 AI입니다.
원칙
- 입력 메시지를 ${input.targetLocale}로 정확하고 자연스럽게 번역.
- ${domain === 'medical' ? '의료 전문용어는 글로서리·이전 대화에서 쓰인 표현을 우선 적용. 임상적으로 정확한 표현 유지.' : '여행/관광 어휘는 환자 친화적으로.'}
- 이전 대화의 맥락(이름, 시술명, 일정, 가격 등)을 일관되게 유지. 같은 시술은 항상 같은 표현으로 번역.
- 문화적 뉘앙스 보존 (한국어 존댓말 / 영어 polite register / 러시아어 Вы / 일본어 です・ます / 중국어 您).
- 환자의 어조(공식·친근·긴급)를 그대로 옮기되 욕설·비속어는 중립적으로 다듬기.
- 이모지·전화번호·여권번호·URL은 그대로 보존.
- 출력은 번역문만. 설명/주석/원문 반복 금지.
${input.glossarySnippet ? `\n## 의료 글로서리\n${input.glossarySnippet}\n` : ''}${contactBlock ? `\n## 환자 정보\n${contactBlock}\n` : ''}${contextBlock ? `\n## 직전 대화 흐름 (참고용)\n${contextBlock}\n` : ''}`;

  return {
    system,
    messages: [
      {
        role: 'user',
        content: `원문 언어: ${input.sourceLocale ?? '(자동 감지)'}
대상 언어: ${input.targetLocale}

번역할 원문:
${input.text}`,
      },
    ],
  };
}
