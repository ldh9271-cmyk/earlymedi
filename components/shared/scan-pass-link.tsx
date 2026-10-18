'use client';

/**
 * 방문지에 보낼 1회용 비회원 스캔 링크 만들기 (2026-10-18, lib/voucher/scan-pass).
 * 유치업체(사업자)·마스터가 실제 병원·매장 담당자에게 카톡·문자로 보내면, 그쪽은 계정 없이
 * /scan/p/<pass> 에서 고객 QR 1명분을 스캔한다. 마이페이지(6개 언어)와 /scan(한국어)에서 쓴다.
 */
import { useState } from 'react';

export type ScanPassLabels = {
  open: string; title: string; desc: string; create: string; creating: string;
  copy: string; copied: string; share: string; sendHint: string; expires: string; again: string; failed: string;
};

const KO: ScanPassLabels = {
  open: '🔗 방문지에 보낼 1회용 스캔 링크',
  title: '방문지용 1회용 스캔 링크',
  desc: '실제 방문지(병원·매장)에 비즈니스 계정이 없어도, 이 링크로 고객 1명의 QR 스캔·방문 확인·최종 결제금액 기록을 할 수 있습니다. 사용 뒤에는 무료 가입을 안내합니다.',
  create: '링크 만들기',
  creating: '만드는 중…',
  copy: '복사',
  copied: '복사됨',
  share: '보내기',
  sendHint: '카카오톡·문자로 방문지 담당자에게 보내세요. 고객 1명만 쓸 수 있습니다.',
  expires: '{date}까지 유효',
  again: '새 링크',
  failed: '링크를 만들지 못했습니다.',
};

type Org = { id: string | null; name: string };

export default function ScanPassLink({ orgs, labels, defaultOpen = false }: { orgs: Org[]; labels?: Partial<ScanPassLabels>; defaultOpen?: boolean }): JSX.Element | null {
  const L = { ...KO, ...labels };
  const [open, setOpen] = useState(defaultOpen);
  const [orgIdx, setOrgIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (orgs.length === 0) return null;
  const org = orgs[orgIdx] ?? orgs[0];

  async function create(): Promise<void> {
    setBusy(true); setErr(null); setCopied(false);
    try {
      const res = await fetch('/api/voucher/pass', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orgId: org?.id ?? null }) });
      const j = (await res.json()) as { ok: true; url: string; expiresAt: string } | { ok: false; reason: string };
      if (j.ok) setLink({ url: j.url, expiresAt: j.expiresAt });
      else setErr(L.failed);
    } catch {
      setErr(L.failed);
    } finally { setBusy(false); }
  }
  async function copy(): Promise<void> {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { /* 길게 눌러 복사 */ }
  }
  async function share(): Promise<void> {
    if (!link) return;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: L.title, text: L.sendHint, url: link.url }); } catch { /* 취소 */ }
    } else {
      await copy();
    }
  }

  const btn = { border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } as const;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...btn, background: '#fff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
        {L.open}
      </button>
    );
  }
  const until = link ? new Date(link.expiresAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div id="pass-link" style={{ flexBasis: '100%', border: '1px solid #bfdbfe', background: '#f5f9ff', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>🔗 {L.title}</div>
      <p style={{ fontSize: 12, color: '#3f5f8a', margin: '4px 0 10px', lineHeight: 1.55 }}>{L.desc}</p>
      {orgs.length > 1 ? (
        <select value={orgIdx} onChange={(e) => { setOrgIdx(Number(e.target.value)); setLink(null); }}
          style={{ width: '100%', border: '1px solid #dbe4f3', borderRadius: 10, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, background: '#fff' }}>
          {orgs.map((o, i) => <option key={o.id ?? 'master'} value={i}>{o.name}</option>)}
        </select>
      ) : null}
      {link ? (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()}
              style={{ flex: 1, minWidth: 0, border: '1px solid #dbe4f3', borderRadius: 10, padding: '9px 10px', fontSize: 12, fontFamily: 'monospace', background: '#fff' }} />
            <button type="button" onClick={copy} style={{ ...btn, background: '#222', color: '#fff' }}>{copied ? L.copied : L.copy}</button>
            <button type="button" onClick={share} style={{ ...btn, background: '#1d4ed8', color: '#fff' }}>{L.share}</button>
          </div>
          <p style={{ fontSize: 12, color: '#3f5f8a', margin: '8px 0 0', lineHeight: 1.5 }}>
            {L.sendHint} · {L.expires.replace('{date}', until)}
            <button type="button" onClick={create} disabled={busy} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#1d4ed8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{L.again}</button>
          </p>
        </>
      ) : (
        <button type="button" onClick={create} disabled={busy} style={{ ...btn, width: '100%', padding: '11px', fontSize: 14, background: '#1d4ed8', color: '#fff' }}>
          {busy ? L.creating : L.create}
        </button>
      )}
      {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
    </div>
  );
}
