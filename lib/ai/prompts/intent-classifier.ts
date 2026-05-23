import type { AiTextMessage } from '../types';

export function buildIntentMessages(input: {
  recentMessages: Array<{ direction: 'inbound' | 'outbound'; body: string; bodyLocale: string | null }>;
  contactCountryCode: string | null;
  contactLocale: string | null;
}): { system: string; messages: AiTextMessage[] } {
  const system = `당신은 의료관광 인박스의 의도 분류기입니다. 환자 메시지로부터:
1) 의도 분류 (snake_case)
2) 시술/신체부위 키워드
3) 예산·여행 윈도우 추출
4) 감정 점수 (-100..100) + 긴급도
5) 의료·관광 이중 의도 여부 판단
6) 리스크 플래그 (소송·환불·심각한 부작용·미성년자 등)
7) 다음 권장 스테이지 + 빠른답변 단축어 추천
8) 환자 PII 엔티티 (자동 환자 등록 후보)
9) 한국어 1줄 요약

응답은 반드시 단일 JSON 객체. 추가 설명 금지.`;
  const dialog = input.recentMessages
    .slice(-12)
    .map((m) => (m.direction === 'inbound' ? '환자' : '에이전시') + `: ${m.body}`)
    .join('\n');

  const messages: AiTextMessage[] = [
    {
      role: 'user',
      content: `환자 국가: ${input.contactCountryCode ?? '미확인'}
환자 언어: ${input.contactLocale ?? '미확인'}

최근 대화:
${dialog}`,
    },
  ];
  return { system, messages };
}
