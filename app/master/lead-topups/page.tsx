import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { leadTopups, leadUnlocks } from '@/drizzle/schema/lead-market';
import { organizations } from '@/drizzle/schema/organizations';
import { billingAccounts } from '@/drizzle/schema/billing';
import { confirmLeadTopupAction, rejectLeadTopupAction } from './_actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '리드 마켓 충전 관리 — 마스터' };

/**
 * 리드 마켓 충전 관리 — 병원의 충전 신청(10만원 단위)을 입금 대조 후
 * 확정한다. 확정 시 병원 잔액(prepaid_balance_krw)에 가산.
 */

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function kst(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

export default async function MasterLeadTopupsPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const topups = await db
    .select({
      id: leadTopups.id,
      amountWon: leadTopups.amountWon,
      status: leadTopups.status,
      createdAt: leadTopups.createdAt,
      confirmedAt: leadTopups.confirmedAt,
      orgName: organizations.name,
      orgId: organizations.id,
    })
    .from(leadTopups)
    .innerJoin(organizations, eq(leadTopups.organizationId, organizations.id))
    .orderBy(desc(leadTopups.createdAt))
    .limit(100);

  const balances = await db
    .select({
      orgName: organizations.name,
      balance: billingAccounts.prepaidBalanceKrw,
    })
    .from(billingAccounts)
    .innerJoin(organizations, eq(billingAccounts.organizationId, organizations.id))
    .where(eq(organizations.accountType, 'medical'));

  const unlocks = await db
    .select({
      priceWon: leadUnlocks.priceWon,
      createdAt: leadUnlocks.createdAt,
      orgName: organizations.name,
    })
    .from(leadUnlocks)
    .innerJoin(organizations, eq(leadUnlocks.organizationId, organizations.id))
    .orderBy(desc(leadUnlocks.createdAt))
    .limit(30);

  const pending = topups.filter((t) => t.status === 'pending');

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>리드 마켓 충전 관리</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            병원의 충전 신청(10만원 단위)을 입금 대조 후 확정하세요. 확정 즉시 병원 잔액에 반영됩니다.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline' }}>마스터 홈</Link>
      </div>

      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 14 }}>{searchParams.error}</p> : null}
      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 14 }}>{searchParams.ok}</p> : null}

      {/* 병원 잔액 */}
      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {balances.map((b) => (
          <div key={b.orgName} style={{ border: '1px solid #ebebeb', borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
            <strong>{b.orgName}</strong> · 잔액 {won(b.balance)}
          </div>
        ))}
        {balances.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6a6a6a' }}>아직 병원(medical) 조직이 없습니다.</p>
        ) : null}
      </div>

      {/* 충전 신청 */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 10px' }}>
        충전 신청 {pending.length > 0 ? `— 대기 ${pending.length}건` : ''}
      </h2>
      <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['병원', '금액', '상태', '신청일', '처리'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 12, color: '#6a6a6a', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topups.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6a6a6a' }}>충전 신청이 없습니다.</td></tr>
            ) : topups.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid #ebebeb' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{t.orgName}</td>
                <td style={{ padding: 12, fontWeight: 700 }}>{won(t.amountWon)}</td>
                <td style={{ padding: 12 }}>
                  {t.status === 'pending' ? (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>입금 확인 대기</span>
                  ) : t.status === 'confirmed' ? (
                    <span style={{ color: '#047857' }}>충전 완료</span>
                  ) : (
                    <span style={{ color: '#dc2626' }}>반려</span>
                  )}
                </td>
                <td style={{ padding: 12, color: '#6a6a6a', whiteSpace: 'nowrap' }}>
                  {kst(t.createdAt)}
                </td>
                <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                  {t.status === 'pending' ? (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <form action={confirmLeadTopupAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          입금 확인
                        </button>
                      </form>
                      <form action={rejectLeadTopupAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" style={{ background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          반려
                        </button>
                      </form>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 최근 열람 */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 10px' }}>최근 리드 열람</h2>
      {unlocks.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6a6a6a' }}>아직 열람 내역이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {unlocks.map((u, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <span><strong>{u.orgName}</strong> 이(가) 리드 열람</span>
              <span>{won(u.priceWon)} · {kst(u.createdAt).slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
