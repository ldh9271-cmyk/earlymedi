import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { commissionLedger, referralPartners } from '@/drizzle/schema/referral-program';
import { listDistributors } from '@/lib/referral/service';
import { createDistributorAction } from './_actions';

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
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const distributors = await listDistributors();
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>총판 · 추천인 프로그램</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            해외 총판과 그 아래 추천인 네트워크. 수당은 시술·여행상품 실적에서만 발생하고 2단계까지 배분됩니다.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline' }}>마스터 홈</Link>
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
          <div><span style={label}>국가 코드</span><input name="countryCode" defaultValue="JP" maxLength={2} style={input} /></div>
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
    </div>
  );
}
