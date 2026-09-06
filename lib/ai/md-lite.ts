/**
 * 아주 작은 마크다운 → HTML 변환기 (외부 의존성 없음).
 * AI 여행 일정처럼 제목(#, ##, ###)·굵게(**)·목록(-, 1.)·문단·줄바꿈만 있는 텍스트용.
 * 입력을 먼저 HTML 이스케이프하므로 dangerouslySetInnerHTML 에 넣어도 안전하다.
 * 채팅 말풍선(클라이언트)과 이메일(서버) 양쪽에서 같은 결과를 낸다.
 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // [텍스트](/kr/…) 내부 링크만 허용
  out = out.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = (): void => { if (para.length) { html.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = []; } };
  const closeList = (): void => { if (list) { html.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if (h) { flushPara(); closeList(); const lv = Math.min(3, h[1]?.length ?? 1) + 1; html.push(`<h${lv}>${inline(h[2] ?? '')}</h${lv}>`); continue; }
    if (ul || ol) {
      flushPara();
      const kind: 'ul' | 'ol' = ul ? 'ul' : 'ol';
      if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inline((ul ?? ol)?.[1] ?? '')}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara(); closeList();
  return html.join('\n');
}
