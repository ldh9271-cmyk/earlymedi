/**
 * AI 상담 답변 끝의 예약 초안 블록 `<booking>{…}</booking>` — 서버(파싱)와 클라이언트(표시에서 제거) 공용, 의존성 없음.
 */
export const BOOKING_OPEN = '<booking>';
export const BOOKING_CLOSE = '</booking>';

/** 완성된 블록을 떼어 내고 JSON 을 파싱한다 (실패하면 raw=null). 텍스트는 블록을 뺀 것 */
export function extractBookingBlock(text: string): { text: string; raw: unknown | null } {
  const re = /<booking>\s*([\s\S]*?)\s*<\/booking>/;
  const m = re.exec(text);
  if (!m) return { text: stripBookingBlock(text), raw: null };
  let raw: unknown | null = null;
  try { raw = JSON.parse(m[1] ?? ''); } catch { raw = null; }
  return { text: stripBookingBlock(text), raw };
}

/** 화면 표시용 — 완성 블록과 스트리밍 중 잘린 꼬리(`<booking…`) 모두 지운다 */
export function stripBookingBlock(text: string): string {
  let out = text.replace(/<booking>[\s\S]*?<\/booking>/g, '');
  const i = out.indexOf(BOOKING_OPEN);
  if (i >= 0) out = out.slice(0, i);
  // 모델이 태그를 ` ``` ` 로 감싸거나 태그 앞에 '```json' 을 붙이는 경우의 찌꺼기
  return out.replace(/```(json)?\s*$/g, '').replace(/[ \t]+\n/g, '\n').trimEnd();
}
