import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { fetchTossSettlements, tossConfigured } from '@/lib/payments/toss';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';

export const metadata = { title: '토스 정산 내역' };
export const dynamic = 'force-dynamic';

/**
 * 토스페이먼츠 정산 내역 — 토스 정산 API(/v1/settlements)를 서버에서
 * 시크릿 키로 직접 조회해 거래일·지급일·수수료·지급액을 보여준다.
 * 카드 결제 대금이 언제 얼마(수수료 차감 후) 입금되는지 여기서 확인.
 *
 * 심사중(테스트 키) 동안은 정산 데이터가 비어 있는 게 정상 — 라이브
 * 키로 전환하면 실제 정산이 표시된다.
 */

const METHOD_LABEL: Record<string, string> = {
  카드: '카드',
  CARD: '카드',
  가상계좌: '가상계좌',
  간편결제: '간편결제',
  계좌이체: '계좌이체',
  휴대폰: '휴대폰',
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function TossSettlementsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; dateType?: string };
}): Promise<JSX.Element> {
  await requireAccess({ allowedAccountTypes: ['agency'] });

  const today = kstToday();
  const defaultFrom = `${today.slice(0, 7)}-01`;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '') ? searchParams.from! : defaultFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.to ?? '') ? searchParams.to! : today;
  const dateType = searchParams.dateType === 'paidOutDate' ? 'paidOutDate' : 'soldDate';

  const configured = tossConfigured();
  const result = configured
    ? await fetchTossSettlements({ startDate: from, endDate: to, dateType })
    : null;

  const rows = result?.ok ? result.settlements : [];
  const totals = rows.reduce(
    (acc, r) => ({
      amount: acc.amount + r.amount,
      fee: acc.fee + r.fee,
      payOut: acc.payOut + r.payOutAmount,
    }),
    { amount: 0, fee: 0, payOut: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/agency/payments" className="text-xs text-muted-foreground hover:underline">
          ← 결제 · 인보이스
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="brand">🏦 토스 정산</Badge>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">토스페이먼츠 정산 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          토스 정산 API 를 실시간 조회합니다 — 거래(매출)별로 수수료가 얼마 빠지고, 언제 우리
          계좌로 지급되는지 확인하세요. 자세한 명세서는{' '}
          <a
            href="https://dashboard.tosspayments.com/sales-reports"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            토스 대시보드 → 매출 · 정산
          </a>
          에서.
        </p>
      </div>

      {/* 기간 필터 */}
      <form action="/agency/payments/settlements" className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">시작일</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">종료일</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">기준일</span>
          <select
            name="dateType"
            defaultValue={dateType}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="soldDate">거래일 기준</option>
            <option value="paidOutDate">지급일 기준</option>
          </select>
        </label>
        <button type="submit" className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-muted/50">
          조회
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="정산 건수" value={`${rows.length}건`} />
        <StatCard label="거래 금액" value={won(totals.amount)} />
        <StatCard label="수수료" value={`- ${won(totals.fee)}`} />
        <StatCard label="지급액 (입금)" value={won(totals.payOut)} highlight />
      </div>

      {!configured ? (
        <Notice title="토스 키가 설정되지 않았습니다">
          TOSS_SECRET_KEY 환경변수를 설정하면 정산 내역이 표시됩니다.
        </Notice>
      ) : !result?.ok ? (
        <Notice title="토스 정산 API 조회 실패">
          {result?.errorCode}
          {result?.errorMessage ? ` — ${result.errorMessage}` : ''}
          <br />
          테스트(sandbox) 키는 정산 API 를 지원하지 않을 수 있습니다 — MID 심사 승인 후 라이브
          키로 전환하면 정상 조회됩니다.
        </Notice>
      ) : rows.length === 0 ? (
        <Notice title="해당 기간의 정산 내역이 없습니다">
          현재 심사중이라 테스트 키로 운영 중입니다 — 테스트 결제는 실제 정산이 생기지 않아 비어
          있는 게 정상입니다. 심사 승인 → 라이브 키 전환 후 실 카드 결제가 발생하면 여기에 거래별
          수수료 · 지급 일정이 표시됩니다.
        </Notice>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">거래일</th>
                  <th className="px-2 py-2.5 text-left font-medium">지급일</th>
                  <th className="px-2 py-2.5 text-left font-medium">주문번호</th>
                  <th className="px-2 py-2.5 text-left font-medium">수단</th>
                  <th className="px-2 py-2.5 text-right font-medium">거래 금액</th>
                  <th className="px-2 py-2.5 text-right font-medium">수수료</th>
                  <th className="px-4 py-2.5 text-right font-medium">지급액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.paymentKey}-${i}`} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5">{r.soldDate}</td>
                    <td className="px-2 py-2.5">
                      {r.paidOutDate}
                      {r.paidOutDate && r.paidOutDate <= today ? (
                        <span className="ml-1 text-[9px] font-semibold text-care-700">지급됨</span>
                      ) : r.paidOutDate ? (
                        <span className="ml-1 text-[9px] text-muted-foreground">예정</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5">
                      <Link href={`/agency/payments?q=${r.orderId}`} className="font-mono text-[11px] hover:underline">
                        {r.orderId}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">{METHOD_LABEL[r.method] ?? r.method}</td>
                    <td className="px-2 py-2.5 text-right">{won(r.amount)}</td>
                    <td className="px-2 py-2.5 text-right text-muted-foreground">- {won(r.fee)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{won(r.payOutAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <Card className={highlight ? 'border-brand-300 bg-brand-50/40' : ''}>
      <CardContent className="p-4">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm">
        <p className="font-semibold">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}
