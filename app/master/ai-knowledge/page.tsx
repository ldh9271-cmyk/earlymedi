import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { fetchActiveKnowledge, listKnowledgeDocs, type KnowledgeDocRow } from '@/lib/ai/knowledge/db';
import { BUILTIN_SOURCE, rankKnowledge, type KnowledgeSource } from '@/lib/ai/knowledge/retrieve';
import { KB_CACHE_TTL_SEC } from '@/lib/ai/knowledge/store';
import { KB_CAT_KO, kbCatLabel as catLabel } from '@/lib/ai/knowledge/cat-labels';
import { toggleDocAction } from './_actions';
import UploadForm from './_components/upload-form';
import { DeleteDocButton } from './_components/delete-doc-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI 상담 지식 문서 — 마스터 관리자' };

/**
 * AI 상담 지식 문서 관리.
 *  Word(.docx)·마크다운을 올리면 서버가 변환·청킹해 DB 에 저장하고, /api/ai/chat 이 활성 문서의 청크를
 *  60초 캐시(변경 시 즉시 무효화)로 읽어 KNOWLEDGE 근거로 쓴다. 활성 문서가 없거나 DB 가 실패하면
 *  빌드에 내장된 청크(lib/ai/knowledge/chunks.generated.ts)로 폴백한다.
 */
const fmt = (d: Date): string => new Date(d).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const catSummary = (cats: Record<string, number>, n = 6): string =>
  Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${catLabel(k)} ${v}`).join(' · ');

const btn: React.CSSProperties = { background: '#fff', border: '1px solid #dddddd', borderRadius: 9999, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#222' };

export default async function MasterAiKnowledgePage({
  searchParams,
}: {
  searchParams: { q?: string; cat?: string; ok?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  let docs: KnowledgeDocRow[] = [];
  let live: KnowledgeSource | null = null;
  let dbError: string | null = null;
  try {
    [docs, live] = await Promise.all([listKnowledgeDocs(db), fetchActiveKnowledge(db)]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db_error';
  }
  const active = docs.filter((d) => d.status === 'active');
  const q = (searchParams.q ?? '').trim().slice(0, 300);
  const cats = (searchParams.cat ?? '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  const testSource = live ?? BUILTIN_SOURCE;
  const test = q ? rankKnowledge(q, { cats }, testSource) : null;
  const catOptions = [...new Set(testSource.chunks.map((c) => c.cat))].sort();

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>AI 상담 지식 문서</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            의료용어·급여/비급여·K뷰티 서비스 같은 학습 자료를 Word 로 올리면 서버가 표 행·절 단위 청크로 쪼개 저장하고, 실시간 AI 상담이 질문마다 관련 청크를 골라 답변 근거로 씁니다.
            올리거나 끄면 캐시를 바로 비우므로 다음 상담 요청부터 반영됩니다(최대 {KB_CACHE_TTL_SEC}초). 활성 문서가 없거나 DB 에 문제가 있으면 빌드에 내장된 청크로 자동 폴백합니다.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline', whiteSpace: 'nowrap' }}>마스터 홈</Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ border: '1px solid #ebebeb', borderRadius: 9999, padding: '6px 14px', background: '#fff' }}>활성 문서 <b>{active.length}</b> / 전체 {docs.length}</span>
        <span style={{ border: '1px solid #ebebeb', borderRadius: 9999, padding: '6px 14px', background: '#fff' }}>활성 청크 <b>{live?.chunks.length ?? 0}</b> · 별칭 {live?.aliases.length ?? 0}</span>
        <span style={{ border: '1px solid #ebebeb', borderRadius: 9999, padding: '6px 14px', background: live ? '#ecfdf5' : '#fff7ed', color: live ? '#047857' : '#b45309', fontWeight: 600 }}>
          상담 소스: {live ? 'DB 문서' : `내장 폴백 (${BUILTIN_SOURCE.chunks.length}청크)`}
        </span>
      </div>

      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 16, fontWeight: 600 }}>{searchParams.ok}</p> : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>처리에 실패했습니다: {searchParams.error}</p> : null}
      {dbError ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>DB 를 읽지 못했습니다(상담은 내장 청크로 폴백 중): {dbError}</p> : null}

      <UploadForm catLabels={KB_CAT_KO} />

      <div style={{ marginTop: 24, border: '1px solid #ebebeb', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6a6a6a', fontSize: 12, background: '#fafafa' }}>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>제목</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>청크</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>상태</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>업로드</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>동작</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#6a6a6a' }}>올린 문서가 없습니다 — 상담은 빌드에 내장된 청크로 답합니다.</td></tr>
            ) : docs.map((d) => (
              <tr key={d.id} style={{ borderTop: '1px solid #f0f0f0', opacity: d.status === 'active' ? 1 : 0.55 }}>
                <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 600 }}>{d.title}</div>
                  <div style={{ color: '#6a6a6a', fontSize: 12, marginTop: 2 }}>{d.slug}{d.sourceFilename ? ` · ${d.sourceFilename}` : ''}</div>
                </td>
                <td style={{ padding: '12px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <b>{d.chunkCount.toLocaleString('ko-KR')}</b>
                  <div style={{ color: '#6a6a6a', fontSize: 11, marginTop: 2, whiteSpace: 'normal', maxWidth: 260 }}>{catSummary(d.cats)}</div>
                </td>
                <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                  <span style={{ background: d.status === 'active' ? '#ecfdf5' : '#f5f5f5', color: d.status === 'active' ? '#047857' : '#6a6a6a', borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {d.status === 'active' ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  {fmt(d.createdAt)}
                  <div style={{ color: '#6a6a6a', fontSize: 11, marginTop: 2 }}>{d.uploadedBy ?? ''}</div>
                </td>
                <td style={{ padding: '12px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <form action={toggleDocAction} style={{ display: 'inline', marginRight: 8 }}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="status" value={d.status === 'active' ? 'disabled' : 'active'} />
                    <button type="submit" style={btn}>{d.status === 'active' ? '비활성화' : '활성화'}</button>
                  </form>
                  <Link href={`/master/ai-knowledge/${d.id}`} style={{ fontSize: 12, color: '#222', textDecoration: 'underline', marginRight: 10 }}>원문·청크</Link>
                  <DeleteDocButton id={d.id} title={d.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>검색 테스트</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 12px' }}>
          질문을 넣으면 지금 상담이 프롬프트에 넣을 청크(점수순, 최대 8개)를 보여 줍니다. 과·업종을 고르면 상담이 질문에서 그 과를 알아냈을 때처럼 가중치가 붙습니다. 지금 소스: {live ? `DB 활성 문서 ${active.length}개` : '내장 폴백'}.
        </p>
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="예: 임플란트 보험 되나요 · 써마지랑 울쎄라 차이 · 二重の埋没法 何日滞在"
            style={{ flex: '1 1 360px', border: '1px solid #dddddd', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}
          />
          <select name="cat" defaultValue={searchParams.cat ?? ''} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, background: '#fff' }}>
            <option value="">과·업종 가중치 없음</option>
            {catOptions.map((c) => <option key={c} value={c}>{catLabel(c)} ({c})</option>)}
          </select>
          <button type="submit" style={{ background: '#222', color: '#fff', border: 0, borderRadius: 9999, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>찾기</button>
        </form>
        {test ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: '#6a6a6a' }}>
              검색어: {test.terms.length ? test.terms.join(', ') : '(없음)'} · 잡힌 청크 {test.hits.length}개 · 프롬프트 {test.text.length.toLocaleString('ko-KR')}자
            </div>
            {test.hits.length === 0 ? (
              <p style={{ fontSize: 13, color: '#b45309', marginTop: 8 }}>잡히는 청크가 없습니다 — 이 질문에는 병원·상품 DATA 와 상담 원칙만으로 답합니다.</p>
            ) : (
              <ol style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {test.hits.map((h, i) => (
                  <li key={h.chunk.id} style={{ border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 14px', background: '#fff', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ color: '#ff385c', fontWeight: 700 }}>{i + 1}</span>
                      <b>{h.chunk.title}</b>
                      <span style={{ color: '#6a6a6a', fontSize: 12 }}>{h.score.toFixed(1)}점 · {catLabel(h.chunk.cat)} · {h.chunk.id}</span>
                    </div>
                    <div style={{ color: '#6a6a6a', fontSize: 11, marginTop: 2 }}>{[h.chunk.chapter, h.chunk.section].filter(Boolean).join(' › ')}</div>
                    <div style={{ marginTop: 4, lineHeight: 1.55 }}>{h.chunk.text.length > 360 ? `${h.chunk.text.slice(0, 360)}…` : h.chunk.text}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
