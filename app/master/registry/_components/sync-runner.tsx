'use client';

// 심평원 동기화 실행기 — 서버리스 시간 제한 때문에 1,000건 페이지 단위로
// /api/master/registry/sync 를 done 까지 반복 호출하고 진행률을 보여준다.
import { useState } from 'react';
import { HIRA_DEPTS } from '@/lib/hospital-registry/departments';

type Progress = { page: number; fetched: number; upserted: number; total: number; done: boolean };

const CL_OPTIONS: Array<[string, string]> = [
  ['', '전체 (약국 제외 전 종별 — 약 10만 건, 100회 호출)'],
  ['01', '상급종합병원'], ['11', '종합병원'], ['21', '병원'], ['28', '요양병원'], ['29', '정신병원'],
  ['41', '치과병원'], ['93', '한방병원'], ['31', '의원'], ['51', '치과의원'], ['92', '한의원'],
];

export default function SyncRunner({ hasKey }: { hasKey: boolean }): JSX.Element {
  const [clCd, setClCd] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBasis(): Promise<void> {
    setRunning(true); setError(null); setLog([]); setProgress(null);
    let page = 1; let upserted = 0;
    try {
      // 병원급 그룹을 골랐으면 그 종별만, 전체면 종별 코드 없이 페이지를 돈다
      for (;;) {
        const res = await fetch('/api/master/registry/sync', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pageNo: page, clCd: clCd || undefined }),
        });
        const j = (await res.json()) as { error?: string; fetched?: number; upserted?: number; totalCount?: number; done?: boolean };
        if (!res.ok || j.error) throw new Error(j.error ?? `HTTP ${res.status}`);
        upserted += j.upserted ?? 0;
        setProgress({ page, fetched: j.fetched ?? 0, upserted, total: j.totalCount ?? 0, done: Boolean(j.done) });
        setLog((l) => [`${page}페이지 · ${j.fetched}건 수신 · 누적 ${upserted.toLocaleString('ko-KR')}건 저장`, ...l].slice(0, 12));
        if (j.done) break;
        page += 1;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '동기화 실패');
    } finally {
      setRunning(false);
    }
  }

  async function runDetails(): Promise<void> {
    setRunning(true); setError(null);
    try {
      const res = await fetch('/api/master/registry/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ details: true, limit: 40 }),
      });
      const j = (await res.json()) as { error?: string; refreshed?: number };
      if (!res.ok || j.error) throw new Error(j.error ?? `HTTP ${res.status}`);
      setLog((l) => [`상세(진료과목·시간·교통) ${j.refreshed}건 갱신`, ...l].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : '갱신 실패');
    } finally {
      setRunning(false);
    }
  }

  async function runDepts(): Promise<void> {
    setRunning(true); setError(null);
    try {
      for (const d of HIRA_DEPTS) {
        const res = await fetch('/api/master/registry/sync', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deptCode: d.code }),
        });
        const j = (await res.json()) as { error?: string; hospitals?: number; updated?: number };
        if (!res.ok || j.error) throw new Error(`${d.ko}: ${j.error ?? `HTTP ${res.status}`}`);
        setLog((l) => [`진료과목 ${d.code} ${d.ko} · 기관 ${j.hospitals} · 신규 반영 ${j.updated}`, ...l].slice(0, 12));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '진료과목 동기화 실패');
    } finally {
      setRunning(false);
    }
  }

  async function runBeautyRecent(): Promise<void> {
    setRunning(true); setError(null);
    try {
      const res = await fetch('/api/master/registry/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ beautyRecent: true }),
      });
      const j = (await res.json()) as { error?: string; pages?: number; upserted?: number };
      if (!res.ok || j.error) throw new Error(j.error ?? `HTTP ${res.status}`);
      setLog((l) => [`미용업 최근 3일 갱신 · ${j.pages}페이지 · ${j.upserted}건`, ...l].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : '미용업 갱신 실패');
    } finally {
      setRunning(false);
    }
  }

  const pct = progress && progress.total > 0 ? Math.min(100, Math.round(((progress.page * 1000) / progress.total) * 100)) : 0;

  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: 18 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>심평원 병원정보 동기화</h2>
      <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 12px', lineHeight: 1.6 }}>
        공공데이터포털 <b>건강보험심사평가원_병원정보서비스</b> 를 1,000건씩 받아 저장합니다. 기존 행은 공공 필드만
        갱신되고 계약 연결·외국인 표기·클레임은 보존됩니다.
        {!hasKey ? <span style={{ color: '#dc2626', fontWeight: 700 }}> — Vercel 환경변수 HIRA_SERVICE_KEY 가 아직 없습니다.</span> : null}
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={clCd} onChange={(e) => setClCd(e.target.value)} disabled={running}
          style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', minWidth: 260 }}>
          {CL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" onClick={runBasis} disabled={running || !hasKey}
          style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: running || !hasKey ? 0.6 : 1 }}>
          {running ? '동기화 중…' : '기본정보 동기화 실행'}
        </button>
        <button type="button" onClick={runDetails} disabled={running || !hasKey}
          style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: running || !hasKey ? 0.6 : 1 }}>
          상세 40건 갱신
        </button>
        <button type="button" onClick={runDepts} disabled={running || !hasKey}
          style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: running || !hasKey ? 0.6 : 1 }}>
          진료과목(과별) 동기화
        </button>
        <button type="button" onClick={runBeautyRecent} disabled={running || !hasKey}
          style={{ background: '#9d174d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: running || !hasKey ? 0.6 : 1 }}>
          미용업(뷰티샵) 최근 갱신
        </button>
      </div>
      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress.done ? 100 : pct}%`, height: '100%', background: '#ff385c', transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 4 }}>
            {progress.done ? '완료' : `${pct}%`} · 대상 {progress.total.toLocaleString('ko-KR')}건 · 저장 {progress.upserted.toLocaleString('ko-KR')}건
          </div>
        </div>
      ) : null}
      {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{error}</p> : null}
      {log.length > 0 ? (
        <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: 12, color: '#6a6a6a', fontFamily: 'monospace' }}>
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
