/**
 * Word(.docx) → 지식 문서 마크다운 변환 (lib/ai/knowledge/docx.ts — 마스터 업로드 API 와 같은 변환기).
 * 내장 폴백(docs/*.md)에 문서를 추가할 때만 쓴다. 운영 반영은 마스터 콘솔(/master/ai-knowledge)에서 바로 올리면 된다.
 *
 *   npx tsx scripts/kb-import-docx.ts <파일.docx> <이름>      # → lib/ai/knowledge/docs/<이름>.md, 이어서 npx tsx scripts/kb-build.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docxToMarkdown } from '../lib/ai/knowledge/docx';

const [, , src, name] = process.argv;
if (!src || !name) {
  console.error('usage: npx tsx scripts/kb-import-docx.ts <file.docx> <name>');
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = docxToMarkdown(readFileSync(src), { sourceName: path.basename(src) });
const dest = path.join(root, 'lib/ai/knowledge/docs', `${name}.md`);
mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, md);
console.log(`→ ${path.relative(root, dest)} (${md.split('\n').length} lines)`);
