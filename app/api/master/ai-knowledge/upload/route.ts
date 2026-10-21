export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { chunkMarkdown } from '@/lib/ai/knowledge/chunker';
import { docxToMarkdown } from '@/lib/ai/knowledge/docx';
import { insertKnowledgeDoc } from '@/lib/ai/knowledge/db';
import { invalidateKnowledgeCache } from '@/lib/ai/knowledge/store';

/**
 * 마스터 전용 — AI 상담 지식 문서 업로드.
 *
 *   POST multipart/form-data { file: .docx | .md | .markdown | .txt, title?: string }
 *   → 서버에서 docx→마크다운 변환(lib/ai/knowledge/docx.ts) → 청킹(chunker.ts) → ai_knowledge_docs/chunks 저장
 *   → 캐시 무효화(revalidateTag) 로 다음 상담 요청부터 반영. 응답 { ok, id, slug, chunkCount, cats }.
 *
 * 서버 액션 대신 라우트인 이유: 파일을 fetch 로 보내고 진행 상태·오류를 화면에서 바로 보여 주기 위해(registry sync 와 같은 패턴).
 */
const MAX_BYTES = 15 * 1024 * 1024;
const TEXT_EXT = new Set(['md', 'markdown', 'txt']);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email ?? '';
  if (!auth.user || !isMasterEmail(email)) {
    return NextResponse.json({ error: 'forbidden', message: '마스터 권한이 필요합니다.' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'multipart/form-data 로 보내 주세요.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File) || !file.name) {
    return NextResponse.json({ error: 'no_file', message: '파일(.docx 또는 .md)을 선택해 주세요.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large', message: '파일이 15MB 를 넘습니다.' }, { status: 413 });
  }
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const title = String(form.get('title') ?? '').trim().slice(0, 200) || file.name.replace(/\.[^.]+$/, '');

  let markdown: string;
  try {
    if (ext === 'docx') markdown = docxToMarkdown(Buffer.from(await file.arrayBuffer()), { sourceName: file.name });
    else if (TEXT_EXT.has(ext)) markdown = await file.text();
    else return NextResponse.json({ error: 'unsupported', message: `.${ext} 는 지원하지 않습니다 — Word(.docx) 또는 마크다운(.md)만.` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'convert_failed', message: `변환 실패: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 400 });
  }

  // 저장 전에 청크 수를 본다 — 0개면 문서 구조(장 제목 `# N. 제목`, 표)가 규칙과 맞지 않는 것
  const preview = chunkMarkdown(markdown, 'preview');
  if (preview.chunks.length === 0) {
    return NextResponse.json(
      { error: 'no_chunks', message: '청크가 0개입니다. 장 제목(`N. 제목`)과 표(첫 칸 = 용어)가 있는 문서인지 확인해 주세요. 목차·부록·대화 예시만 있는 문서는 넣을 수 없습니다.' },
      { status: 400 },
    );
  }

  try {
    const r = await insertKnowledgeDoc(db, { title, sourceFilename: file.name, markdown, uploadedBy: email });
    invalidateKnowledgeCache();
    revalidatePath('/master/ai-knowledge');
    return NextResponse.json({ ok: true, id: r.id, slug: r.slug, chunkCount: r.chunkCount, cats: r.cats });
  } catch (err) {
    console.error('[ai-knowledge] upload failed:', err);
    return NextResponse.json({ error: 'db_error', message: `저장 실패: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }
}
