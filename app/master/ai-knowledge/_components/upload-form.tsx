'use client';

// AI 상담 지식 문서 업로드 — Word(.docx)/마크다운을 /api/master/ai-knowledge/upload 로 보내고 결과(청크 수)를 바로 보여 준다.
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type UploadResponse = { error?: string; message?: string; slug?: string; chunkCount?: number; cats?: Record<string, number> };

export default function UploadForm({ catLabels }: { catLabels: Record<string, string> }): JSX.Element {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg({ kind: 'error', text: '파일을 선택해 주세요 (.docx 또는 .md).' }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      const res = await fetch('/api/master/ai-knowledge/upload', { method: 'POST', body: fd });
      const j = (await res.json()) as UploadResponse;
      if (!res.ok || j.error) throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`);
      const cats = Object.entries(j.cats ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${catLabels[k] ?? k} ${v}`).join(' · ');
      setMsg({ kind: 'ok', text: `저장 완료 · ${j.slug} · 청크 ${j.chunkCount}개 (${cats}) — 다음 상담 요청부터 근거로 씁니다.` });
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : '업로드 실패' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ border: '1px solid #ebebeb', borderRadius: 12, background: '#fff', padding: '16px 18px', marginTop: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>문서 올리기</div>
      <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 12px' }}>
        Word(.docx) 또는 마크다운(.md). 장 제목은 <code>N. 제목</code>(피부과·치과·네일 … 단어로 과·업종이 정해짐), 용어 표는 첫 칸이 용어. 서버가 변환·청킹해 저장하고 바로 상담에 반영합니다.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".docx,.md,.markdown,.txt"
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '')); }}
          style={{ fontSize: 13 }}
        />
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (비우면 파일명)"
          maxLength={200}
          disabled={busy}
          style={{ flex: '1 1 260px', border: '1px solid #dddddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{ background: busy ? '#9c9c9c' : '#ff385c', color: '#fff', border: 0, borderRadius: 9999, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? '변환·저장 중…' : '업로드'}
        </button>
      </div>
      {msg ? (
        <p style={{ fontSize: 13, marginTop: 10, color: msg.kind === 'ok' ? '#047857' : '#dc2626', fontWeight: msg.kind === 'ok' ? 600 : 400 }}>{msg.text}</p>
      ) : null}
    </form>
  );
}
