import type { AiTextMessage } from '../types';

export function buildTranslationMessages(input: {
  text: string;
  sourceLocale?: string;
  targetLocale: string;
  glossarySnippet?: string;
  domain?: 'medical' | 'travel' | 'general';
}): { system: string; messages: AiTextMessage[] } {
  const domain = input.domain ?? 'medical';
  const system = `당신은 의료관광 도메인 전문 번역가입니다.
- 입력 텍스트를 ${input.targetLocale}로 정확하고 자연스럽게 번역.
- ${domain === 'medical' ? '의료 전문용어는 글로서리를 우선 적용, 임상적으로 정확한 표현 사용.' : '여행/관광 어휘는 환자 친화적으로.'}
- 문화적 뉘앙스 보존 (존중 표현·존댓말).
- 출력은 번역문만. 설명/주석 금지.
${input.glossarySnippet ? `\n## 글로서리\n${input.glossarySnippet}\n` : ''}`;
  return {
    system,
    messages: [
      {
        role: 'user',
        content: `원문 언어: ${input.sourceLocale ?? '(자동 감지)'}
원문:
${input.text}`,
      },
    ],
  };
}
