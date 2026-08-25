import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { commissionLedger, referralPartners } from '@/drizzle/schema/referral-program';
import { getRegionAdmin, listDistributors, listRegionAdmins } from '@/lib/referral/service';
import { addRegionAdminAction, createDistributorAction, removeRegionAdminAction } from './_actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '총판·추천인 프로그램 — 마스터 관리자' };

const input: React.CSSProperties = {
  border: '1px solid #dddddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%',
};
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6a6a6a', display: 'block', marginBottom: 4 };

export default async function MasterPartnersPage({
  searchParams,
}: { searchParams: { error?: string; ok?: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const email = (auth.user.email ?? '').toLowerCase();
  const isMaster = isMasterEmail(email);
  // 지역 마스터(예: 일본 마스터)는 자기 국가 총판만 본다
  const region = isMaster ? null : await getRegionAdmin(email);
  if (!isMaster && !region) redirect('/select-org');

  const distributors = await listDistributors(region ?? undefined);
  const admins = isMaster ? await listRegionAdmins() : [];
  const stats = await Promise.all(distributors.map(async (d) => {
    const [ref] = await db.select({ n: sql<number>`count(*)::int` }).from(referralPartners)
      .where(eq(referralPartners.distributorId, d.id));
    const led = await db
      .select({ status: commissionLedger.status, amount: sql<number>`coalesce(sum(${commissionLedger.amountWon}),0)::int` })
      .from(commissionLedger).where(eq(commissionLedger.distributorId, d.id)).groupBy(commissionLedger.status);
    const t = { pending: 0, confirmed: 0, paid: 0 };
    for (const r of led) if (r.status in t) t[r.status as keyof typeof t] = r.amount;
    return { referrers: ref?.n ?? 0, ...t };
  }));

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>총판 · 추천인 프로그램{region ? ` — ${region} 지역` : ''}</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            해외 총판과 그 아래 추천인 네트워크. 수당은 시술·여행상품 실적에서만 발생하고 2단계까지 배분됩니다.
          </p>
        </div>
        {isMaster ? <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline' }}>마스터 홈</Link> : <span style={{ fontSize: 13, color: '#6a6a6a' }}>{email} · 지역 마스터</span>}
      </div>

      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 14 }}>{searchParams.error}</p> : null}
      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 14 }}>{searchParams.ok}</p> : null}

      <div style={{ marginTop: 20, border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['총판', '코드', '국가 / 랜딩', '추천인', '클릭 / 가입', '대기', '확정', '지급 완료', ''].map((h) => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 12, color: '#6a6a6a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {distributors.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: '#6a6a6a' }}>아직 등록된 총판이 없습니다. 아래에서 첫 총판을 만드세요.</td></tr>
            ) : distributors.map((d, i) => {
              const s = stats[i] ?? { referrers: 0, pending: 0, confirmed: 0, paid: 0 };
              return (
                <tr key={d.id} style={{ borderTop: '1px solid #ebebeb' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: '#9c9c9c' }}>{d.userEmail ?? d.contact ?? ''}{!d.isActive ? ' · 비활성' : ''}</div>
                  </td>
                  <td style={{ padding: 12, fontFamily: 'monospace', fontWeight: 700 }}>{d.code}</td>
                  <td style={{ padding: 12 }}>{d.countryCode} / {d.landingLocale}</td>
                  <td style={{ padding: 12 }}>{s.referrers}명</td>
                  <td style={{ padding: 12 }}>{d.clicks} / {d.signups}</td>
                  <td style={{ padding: 12 }}>₩{s.pending.toLocaleString('ko-KR')}</td>
                  <td style={{ padding: 12, color: '#1d4ed8' }}>₩{s.confirmed.toLocaleString('ko-KR')}</td>
                  <td style={{ padding: 12, color: '#047857' }}>₩{s.paid.toLocaleString('ko-KR')}</td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/master/partners/${d.id}`} style={{ fontSize: 12, color: '#222', textDecoration: 'underline' }}>관리</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={createDistributorAction} style={{ marginTop: 28, border: '1px solid #ebebeb', borderRadius: 12, padding: 20, maxWidth: 760 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>새 총판 등록</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 16px' }}>
          코드는 자동 생성됩니다. 수당 비율은 제안서 기본값(운영비 3% · 성형 30 / 피부 20 · 2단계 · 여행 10%)으로 시작하고 상세 화면에서 바꿉니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><span style={label}>총판 이름 (법인명) *</span><input name="name" required style={input} placeholder="예: 株式会社○○ / Tokyo Beauty Partners" /></div>
          <div><span style={label}>담당자 연락처</span><input name="contact" style={input} placeholder="이름 · 전화 · LINE" /></div>
          <div><span style={label}>국가 코드{region ? ' (지역 고정)' : ''}</span><input name="countryCode" defaultValue={region ?? 'JP'} readOnly={!!region} maxLength={2} style={{ ...input, background: region ? '#f5f5f5' : '#fff' }} /></div>
          <div>
            <span style={label}>QR 랜딩 언어</span>
            <select name="landingLocale" defaultValue="ja" style={input}>
              {['ja', 'en', 'zh', 'kr', 'ru', 'vi'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><span style={label}>총판 대시보드 계정 이메일</span><input name="userEmail" type="email" style={input} placeholder="사이트 가입 후 연결됩니다" /></div>
          <div><span style={label}>메모</span><input name="notes" style={input} placeholder="계약일 · 독점 여부 · KPI" /></div>
        </div>
        <button type="submit" style={{ marginTop: 16, background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          총판 만들기
        </button>
      </form>

      {isMaster ? (
        <div style={{ marginTop: 28, border: '1px solid #ebebeb', borderRadius: 12, padding: 20, maxWidth: 760 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>지역 마스터 계정</h2>
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 14px' }}>
            총괄 마스터 아래의 국가별 관리자입니다. 등록된 이메일로 로그인하면 /master/partners 에서 자기 국가의 총판만 보고 생성·정산할 수 있습니다.
            (해당 이메일이 사이트에 가입돼 있어야 합니다)
          </p>
          {admins.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.email} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.email}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{a.countryCode}</td>
                    <td style={{ padding: '8px 10px', color: '#9c9c9c' }}>{a.note ?? ''}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <form action={removeRegionAdminAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="email" value={a.email} />
                        <button type="submit" style={{ border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>해제</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <form action={addRegionAdminAction} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 1.5fr auto', gap: 8, alignItems: 'end' }}>
            <div><span style={label}>이메일 *</span><input name="email" type="email" required style={input} placeholder="jp-master@example.com" /></div>
            <div><span style={label}>국가</span><input name="countryCode" defaultValue="JP" maxLength={2} style={input} /></div>
            <div><span style={label}>메모</span><input name="note" style={input} placeholder="일본 마스터" /></div>
            <button type="submit" style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>등록</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
