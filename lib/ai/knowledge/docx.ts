/**
 * Word(.docx) → 지식 문서 마크다운 변환 (표는 마크다운 표로, 제목 스타일은 #/##/###).
 * 외부 의존성 없음(docx 는 zip 이라 node:zlib 로 word/document.xml 만 푼다) — 마스터 콘솔 업로드 API 와
 * scripts/kb-import-docx.ts 가 같이 쓴다.
 *
 * 제목 규칙: Word 제목 스타일(Heading1~3)이 없으면 "N. 제목" 은 #, "N.M 제목" 은 ## 로 본다.
 */
import { inflateRawSync } from 'node:zlib';

/** zip 안의 한 파일을 꺼낸다 (central directory 를 읽어 local header 로 이동). */
export function unzipEntry(buf: Buffer, wanted: string): Buffer {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip (docx) file');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const total = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const fname = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const localOff = buf.readUInt32LE(p + 42);
    if (fname === wanted) {
      const ln = buf.readUInt16LE(localOff + 26);
      const le = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + ln + le;
      const data = buf.subarray(start, start + csize);
      return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in zip`);
}

const decode = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
const ptext = (p: string): string => decode([...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1] ?? '').join('')).trim();
const pstyle = (p: string): string => (p.match(/<w:pStyle w:val="([^"]+)"/) ?? [])[1] ?? '';

/**
 * docx 바이트 → 마크다운. 첫 줄은 출처 주석(청커가 무시한다).
 */
export function docxToMarkdown(input: Buffer | Uint8Array, opts: { sourceName?: string; date?: string } = {}): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const xml = unzipEntry(buf, 'word/document.xml').toString('utf8');
  const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) ?? [])[1];
  if (body == null) throw new Error('word/document.xml 에 <w:body> 가 없습니다');
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const out: string[] = [`<!-- 출처: ${opts.sourceName ?? 'docx'} (변환 ${date}, lib/ai/knowledge/docx.ts) -->`, ''];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const blk = m[0];
    if (blk.startsWith('<w:tbl>')) {
      const rows: string[][] = [];
      for (const tr of blk.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
        const cells = [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) =>
          [...tc[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => ptext(p[0])).join(' ').replace(/\|/g, '/').trim(),
        );
        if (cells.some(Boolean)) rows.push(cells);
      }
      if (!rows.length) continue;
      const w = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]): string[] => [...r, ...Array<string>(w - r.length).fill('')];
      out.push('', `| ${pad(rows[0] ?? []).join(' | ')} |`, `|${'---|'.repeat(w)}`, ...rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`), '');
      continue;
    }
    const t = ptext(blk);
    if (!t) continue;
    const st = pstyle(blk);
    if (/^Heading\d|^Title/.test(st)) out.push('', `${'#'.repeat(Math.min(st === 'Title' ? 1 : Number(st.replace(/\D/g, '') || 1), 4))} ${t}`, '');
    else if (/^\d{1,2}\.\s/.test(t)) out.push('', `# ${t}`, '');
    else if (/^\d{1,2}\.\d{1,2}\s/.test(t)) out.push('', `## ${t}`, '');
    else out.push(t);
  }
  return out.join('\n') + '\n';
}

/** 마크다운에서 문서 제목 후보: 주석·빈 줄을 뺀 첫 줄(머리말) → 없으면 첫 제목 → 없으면 '' */
export function guessDocTitle(markdown: string): string {
  let heading = '';
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('<!--') || line.startsWith('|')) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) { if (!heading) heading = (h[1] ?? '').trim(); continue; }
    return line.slice(0, 120);
  }
  return heading.slice(0, 120);
}
