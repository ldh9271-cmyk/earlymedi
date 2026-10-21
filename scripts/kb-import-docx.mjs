#!/usr/bin/env node
/**
 * Word(.docx) → 지식 문서 마크다운 변환 (표는 마크다운 표로, 제목 스타일은 #/##/###).
 * AI 상담 학습 자료를 새로 받으면 이걸로 lib/ai/knowledge/docs/<이름>.md 를 만들고 `node scripts/kb-build.mjs` 를 돌린다.
 *
 *   node scripts/kb-import-docx.mjs <파일.docx> <이름>      # → lib/ai/knowledge/docs/<이름>.md
 *
 * 제목 규칙: Word 제목 스타일(Heading1~3)이 없으면 "N. 제목" 은 #, "N.M 제목" 은 ## 로 본다.
 * 외부 의존성 없음(docx 는 zip 이라 node:zlib 로 document.xml 만 푼다).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , src, name] = process.argv;
if (!src || !name) { console.error('usage: node scripts/kb-import-docx.mjs <file.docx> <name>'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** zip 안의 한 파일을 꺼낸다 (central directory 를 읽어 local header 로 이동). */
function unzipEntry(buf, wanted) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const total = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const fname = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), localOff = buf.readUInt32LE(p + 42);
    if (fname === wanted) {
      const ln = buf.readUInt16LE(localOff + 26), le = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + ln + le;
      const data = buf.subarray(start, start + csize);
      return method === 8 ? inflateRawSync(data) : data;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in zip`);
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const ptext = (p) => decode([...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join('')).trim();
const pstyle = (p) => (p.match(/<w:pStyle w:val="([^"]+)"/) ?? [])[1] ?? '';

const xml = unzipEntry(readFileSync(src), 'word/document.xml').toString('utf8');
const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
const out = [`<!-- 출처: ${path.basename(src)} (변환 ${new Date().toISOString().slice(0, 10)}, scripts/kb-import-docx.mjs). 수정 후 node scripts/kb-build.mjs -->`, ''];
for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
  const blk = m[0];
  if (blk.startsWith('<w:tbl>')) {
    const rows = [];
    for (const tr of blk.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
      const cells = [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) => [...tc[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => ptext(p[0])).join(' ').replace(/\|/g, '/').trim());
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (!rows.length) continue;
    const w = Math.max(...rows.map((r) => r.length));
    const pad = (r) => [...r, ...Array(w - r.length).fill('')];
    out.push('', `| ${pad(rows[0]).join(' | ')} |`, `|${'---|'.repeat(w)}`, ...rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`), '');
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
const dest = path.join(root, 'lib/ai/knowledge/docs', `${name}.md`);
mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, out.join('\n') + '\n');
console.log(`→ ${path.relative(root, dest)} (${out.length} lines)`);
