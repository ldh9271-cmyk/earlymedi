import type { AiTextMessage } from '../types';
import type { ChannelKind } from '@/lib/channels/types';

export type ReplyTone =
  | 'concise'
  | 'friendly'
  | 'luxury'
  | 'empathetic'
  | 'detailed';

export type ReplyContext = {
  channelKind: ChannelKind;
  contactDisplayName: string | null;
  contactCountryCode: string | null;
  contactLocale: string | null;
  aiIntentClass: string | null;
  recentMessages: Array<{ direction: 'inbound' | 'outbound'; body: string; bodyLocale: string | null }>;
  glossarySnippet?: string;
};

const TONE_INSTRUCTIONS: Record<ReplyTone, string> = {
  concise:
    '20–40 단어 사이의 간결하고 사실적인 답변. 불필요한 미사여구는 제거. 항상 명확한 다음 행동 1개를 제시.',
  friendly:
    '40–70 단어 사이의 친절하고 공감적인 답변. 환자의 감정을 인정하고, 부드러운 안내. 이모지는 절제하여 1–2개만.',
  luxury:
    '50–90 단어 사이의 격조 있는 컨시어지 톤. 환자의 시간과 결정을 존중하는 표현. VIP·프리미엄 어휘 활용.',
  empathetic:
    '40–70 단어 사이의 공감 우선 답변. 환자의 걱정·불안을 먼저 인정한 뒤("…걱정되시는 마음 충분히 이해합니다") 안심·해결 안내. 의료 우려·통증·후기 불안에 강한 톤.',
  detailed:
    '70–130 단어 사이의 상세 안내형 답변. 절차·일정·준비물·예상 비용 범위를 번호 또는 줄바꿈으로 정리. 정보가 많은 견적·상담 질문에 적합. 마지막에 다음 행동 1개.',
};

const SAFETY_PRINCIPLES = `당신은 한국 보건복지부 등록 외국인환자 유치업체 "KoreaGlowUp"의 다국어 컨시어지 AI입니다.
- 의료 진단/처방을 직접 제시하지 마세요. 의사의 검진·진료를 안내하세요.
- 가격·일정 약속은 "병원 확정 후 확정 견적 발송" 표현으로 보호.
- 환자가 응급/심각한 부작용 호소 시 즉시 의사 에스컬레이션 안내.
- 환불·소송·법적 클레임 언급 시 정확한 대응 매니저 연결 약속.
- PII(여권·전화·주민번호)는 응답에 출력하지 마세요.
- 응답은 환자 사용 언어 또는 명시된 출력 언어로만 작성.`;

export function buildReplyMessages(
  ctx: ReplyContext,
  tone: ReplyTone,
  outputLocale: string,
): { system: string; messages: AiTextMessage[] } {
  const system = `${SAFETY_PRINCIPLES}

## 톤 가이드
${TONE_INSTRUCTIONS[tone]}

## 채널
${ctx.channelKind} 메시지로 발송될 답변. 채널 특성을 반영 (예: WhatsApp/Telegram은 한 메시지 안에서 줄바꿈 자유, 카카오는 짧은 단락 위주).

## 환자
- 이름: ${ctx.contactDisplayName ?? '미확인'}
- 국가: ${ctx.contactCountryCode ?? '미확인'}
- 사용 언어: ${ctx.contactLocale ?? '미확인'}
- AI 분류 의도: ${ctx.aiIntentClass ?? '미분류'}

## 출력 언어
${outputLocale}로만 작성. ${outputLocale}이 환자 모국어가 아니면, 마지막 줄에 (Korean: ...) 형식의 짧은 한국어 동시 요약을 1줄 추가.

## 의료 글로서리 (병원·시술 용어 매칭)
${ctx.glossarySnippet ?? '(없음)'}

## 작성 원칙
- 환자 마지막 메시지의 핵심 질문을 먼저 답함.
- 모르는 정보는 "확인 후 알려드리겠습니다"라고 솔직히 표현.
- 명확한 다음 행동 1개를 끝에 제시 (예: 사진 전송 요청, 일정 후보 제안, 상담 예약 권유).`;

  const dialog = ctx.recentMessages
    .slice(-10)
    .map((m) => (m.direction === 'inbound' ? '환자' : '에이전시') + `: ${m.body}`)
    .join('\n');

  const messages: AiTextMessage[] = [
    {
      role: 'user',
      content: `최근 대화:
${dialog}

위 흐름을 이어 받아 "${tone}" 톤으로 답변을 작성하세요.`,
    },
  ];

  return { system, messages };
}
