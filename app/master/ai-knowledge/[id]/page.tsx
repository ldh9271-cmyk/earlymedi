import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { getKnowledgeDoc } from '@/lib/ai/knowledge/db';
import { chunkMarkdown } from '@/lib/ai/knowledge/chunker';
import { KB_CAT_KO } from '@/lib/ai/knowledge/cat-labels';

export const dynamic = 'force-dynamic';
export const metadata = { title: '지식 문서 원문 — 마스터 관리자' };

/** 올린 문서의 원문(마크다운)과 청킹 결과를 본다 — 장 제목이 과·업종으로 잘 잡혔는지, 표가 행 단위로 쪼개졌는지 확인용 */
export default async function MasterAiKnowledgeDocPage({ params }: { params: { id: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const doc = await getKnowledgeDoc(db, params.id);
  if (!doc) notFound();
  const { chunks, cats } = chunkMarkdown(doc.markdown, doc.slug);
  const chapters = [...new Map(chunks.map((c) => [c.chapter, c.cat])).entries()];

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{doc.title}</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            {doc.slug} · {doc.sourceFilename ?? '—'} · {doc.status === 'active' ? '활성' : '비활성'} · 청크 {chunks.length}개 · 별칭 {doc.aliases.length}개 · {doc.uploadedBy ?? ''}
          </p>
        </div>
        <Link href="/master/ai-knowledge" style={{ fontSize: 13, color: '#222', textDecoration: 'underline', whiteSpace: 'nowrap' }}>← 문서 목록</Link>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 12, background: '#fff', padding: '14px 18px', fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>장 → 과·업종 매핑 (chunker.ts CHAPTER_RULES)</div>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {chapters.map(([chapter, cat]) => (
            <li key={chapter}>{chapter} <span style={{ color: '#6a6a6a' }}>→ {KB_CAT_KO[cat] ?? cat} ({cat}) · {cats[cat] ?? 0}청크</span></li>
          ))}
        </ul>
      </div>

      <details style={{ marginTop: 14, border: '1px solid #ebebeb', borderRadius: 12, background: '#fff', padding: '14px 18px', fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>청크 미리보기 (처음 80개)</summary>
        <ol style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.55 }}>
          {chunks.slice(0, 80).map((c) => (
            <li key={c.id} style={{ marginBottom: 6 }}>
              <b>{c.title}</b> <span style={{ color: '#6a6a6a', fontSize: 11 }}>{c.id} · {c.cat}{c.aliases.length ? ` · 별칭 ${c.aliases.join(', ')}` : ''}</span>
              <div style={{ color: '#3f3f3f' }}>{c.text.length > 240 ? `${c.text.slice(0, 240)}…` : c.text}</div>
            </li>
          ))}
        </ol>
      </details>

      <details style={{ marginTop: 14, border: '1px solid #ebebeb', borderRadius: 12, background: '#fff', padding: '14px 18px', fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>원문 마크다운 ({doc.markdown.length.toLocaleString('ko-KR')}자)</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.5, marginTop: 10, color: '#3f3f3f' }}>{doc.markdown}</pre>
      </details>
    </div>
  );
}
