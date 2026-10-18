import Scanner from '../../_components/scanner';
import { passIssuerName, passUsedOrder, verifyScanPass } from '@/lib/voucher/scan-pass';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR 스캔 · 방문 확인 (1회용 링크)', robots: { index: false, follow: false } };

/**
 * 1회용 비회원 스캔 링크 랜딩 (lib/voucher/scan-pass) — 유치업체·마스터가 보낸 링크로 방문지 담당자가
 * 로그인 없이 고객 QR 1명분을 스캔한다. /scan 은 미들웨어 공개 경로라 이 하위 경로도 공개.
 */
export default async function ScanPassPage({ params }: { params: { pass: string } }): Promise<JSX.Element> {
  const raw = decodeURIComponent(params.pass);
  const v = verifyScanPass(raw);
  const issuer = v.ok ? await passIssuerName(v.pass).catch(() => '글로우업투어') : '';
  const used = v.ok ? await passUsedOrder(v.pass.nonce).catch(() => null) : null;
  const until = v.ok ? new Date(v.pass.exp * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const signupHref = '/signup?from=scan-pass';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
      <div style={{ fontSize: 12, color: '#6a6a6a' }}>GlowUpTour · 방문지 담당자용</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 4px' }}>고객 QR 스캔 · 방문 확인</h1>

      {!v.ok ? (
        <div style={{ border: '1px solid #fecdd3', background: '#fffafb', borderRadius: 14, padding: 18, marginTop: 12 }}>
          <b style={{ color: '#c2143c' }}>{v.reason === 'pass_expired' ? '유효기간이 지난 링크입니다' : '올바르지 않은 링크입니다'}</b>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>
            링크를 보낸 업체에 새 링크를 요청하거나, 무료 비즈니스 계정을 만들면 링크 없이 바로 스캔할 수 있습니다.
            <br />This link is {v.reason === 'pass_expired' ? 'expired' : 'invalid'}. Ask the sender for a new one, or create a free business account.
          </p>
          <a href={signupHref} style={{ display: 'inline-block', marginTop: 12, background: '#ff385c', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>무료 비즈니스 계정 만들기</a>
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 14, padding: '12px 16px', margin: '10px 0 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>🔗 {issuer}에서 보낸 1회용 스캔 링크</div>
            <p style={{ fontSize: 12, color: '#3f5f8a', margin: '4px 0 0', lineHeight: 1.6 }}>
              비즈니스 계정·로그인 없이 <b>고객 1명</b>의 방문 확인과 최종 결제금액 기록을 할 수 있습니다. 고객이 보여주는 글로우업투어 QR 을 스캔하세요. <b>{until}</b> 까지 유효합니다.
              <br />One-time link: scan one customer&apos;s GlowUpTour QR to confirm the visit — no account needed.
            </p>
          </div>
          {used ? (
            <p style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', margin: '0 0 14px', lineHeight: 1.55 }}>
              이 링크로 이미 <b>{used.invoiceNo}</b> 방문 확인을 마쳤습니다. 같은 고객의 금액 정정만 가능합니다(같은 QR 을 다시 스캔). 다른 고객은 무료 비즈니스 계정으로 스캔해 주세요.
            </p>
          ) : null}
          <Scanner orgId="" pass={raw} />
          <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 14, padding: 16, background: '#fff' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>매번 링크를 받지 않으려면</div>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 10px', lineHeight: 1.6 }}>
              무료 비즈니스 계정(30초)을 만들면 마이페이지의 <b>📷 QR 스캔</b> 버튼으로 언제든 바로 스캔하고, 방문·정산 내역도 한곳에서 봅니다.
            </p>
            <a href={signupHref} style={{ display: 'inline-block', background: '#222', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>무료 비즈니스 계정 만들기</a>
          </div>
        </>
      )}
    </main>
  );
}
