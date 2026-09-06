import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { activeOrgId } from '@/lib/auth/active-org-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { recentCheckIns, recentCheckInsAll } from '@/lib/voucher/service';
import Scanner from './_components/scanner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR 스캔 · 방문 확인' };

/**
 * 사업자 공용 QR 스캔 — 소비자가 보여주는 결제 QR 을 읽어 방문 확인.
 * 어느 콘솔(의료기관·파트너·에이전시)에서든 같은 화면. 결과는 소비자 바우처와
 * 마스터 주문 목록에 즉시 반영되고 관리자 텔레그램으로도 알린다.
 * /scan 은 미들웨어 공개 경로라 활성 조직을 쿠키에서 직접 읽고, 마스터는 조직 없이도(모든 주문) 쓸 수 있다.
 */
export default async function ScanPage(): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/scan');
  const isMaster = isMasterEmail(auth.user.email ?? '');
  const orgId = activeOrgId();

  let accountType: string | null = null;
  let orgLabel = '';
  if (orgId) {
    const [org] = await db.select({ accountType: organizations.accountType, name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org) { accountType = org.accountType; orgLabel = org.name; }
    if (!isMaster) {
      const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
        .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
      if (!m) redirect('/select-org?next=/scan');
    }
  } else if (!isMaster) {
    redirect('/select-org?next=/scan');
  }

  const recent = isMaster ? await recentCheckInsAll(30).catch(() => []) : await recentCheckIns(orgId, 20).catch(() => []);
  const backHref = isMaster && !orgId ? '/master'
    : accountType === 'medical' ? '/medical/dashboard' : accountType === 'agency' ? '/agency/dashboard' : accountType === 'freelancer' ? '/freelancer/dashboard' : accountType === 'non_medical' ? '/partner/dashboard' : '/master';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
      <Link href={backHref} style={{ fontSize: 12, color: '#6a6a6a' }}>← {isMaster && !orgId ? '마스터 관리자' : '대시보드'}</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 4px' }}>QR 스캔 · 방문 확인</h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: '0 0 16px', lineHeight: 1.6 }}>
        고객이 마이페이지에서 보여주는 <b>결제 QR</b>을 카메라로 읽으세요. 예약·결제 정보가 플랫폼 DB에서 바로 조회되고,
        <b> 방문 확인</b>을 누르면 고객·사업자·플랫폼 세 화면에 동시에 반영됩니다. 이어서 <b>최종 결제금액</b>을 넣으면 소비자 확인 뒤 플랫폼 수수료가 확정됩니다.
        카메라가 없으면 QR 아래 코드를 직접 입력해도 됩니다.
      </p>
      {isMaster ? (
        <p style={{ fontSize: 12, color: '#c2143c', background: '#fff5f7', border: '1px solid #ffd7de', borderRadius: 10, padding: '8px 12px', margin: '0 0 14px' }}>
          마스터 모드{orgLabel ? ` · ${orgLabel} 로 보는 중` : ''} — 모든 주문을 방문 확인·금액 입력할 수 있습니다. 기록에는 {orgLabel || '글로우업투어 운영'} 이름이 남습니다.
        </p>
      ) : null}

      <Scanner orgId={orgId} />

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 8px' }}>최근 방문 확인 ({recent.length}){isMaster ? ' · 전체' : ''}</h2>
      {recent.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9c9c9c', border: '1px dashed #dddddd', borderRadius: 12, padding: 16 }}>아직 방문 확인 기록이 없습니다.</p>
      ) : (
        <div style={{ border: '1px solid #ebebeb', borderRadius: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['확인 시각', '인보이스', '상품', '예약', '결제', '최종 금액', '고객'].map((h) => <th key={h} style={{ padding: '8px 10px', fontSize: 12, color: '#6a6a6a' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.orderId} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('ko-KR') : '—'}{isMaster && r.checkedInByName ? <div style={{ fontSize: 11, color: '#9c9c9c' }}>{r.checkedInByName}</div> : null}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{r.invoiceNo}</td>
                  <td style={{ padding: '8px 10px' }}>{r.listingTitle}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.reserveDate} {r.reserveTime} · {r.guests}명</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>₩{r.totalWon.toLocaleString('ko-KR')}{r.payOnSiteWon ? ` (+현장 ₩${r.payOnSiteWon.toLocaleString('ko-KR')})` : ''}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.settlement ? `₩${r.settlement.finalAmountWon.toLocaleString('ko-KR')} · ${r.settlement.status}` : '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{r.guestName ?? r.userEmail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
