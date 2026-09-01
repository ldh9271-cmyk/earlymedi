/**
 * 운영자 텔레그램 알림.
 *
 * 결제·주문 이벤트를 관리자 개인 텔레그램으로 보낸다. 인박스용
 * 조직별 텔레그램 채널(lib/channels/telegram-adapter)과는 별개로,
 * 환경 변수 두 개만으로 동작하는 전역 알림이다:
 *
 *   TELEGRAM_BOT_TOKEN     @BotFather 로 만든 봇 토큰
 *   TELEGRAM_ADMIN_CHAT_ID 알림 받을 chat id (쉼표로 여러 명 가능)
 *
 * 미설정이면 조용히 아무것도 하지 않는다 — 알림 실패가 결제 흐름을
 * 막아서는 안 되므로 호출부는 항상 .catch(() => {}) 로 감싼다.
 *
 * 'server-only' 가드는 두지 않는다 — referral service 경유로 통합
 * 테스트(node)에서도 로드된다. 토큰은 NEXT_PUBLIC 이 아니라 클라이언트
 * 번들에 노출되지 않고, vitest 실행 중에는 발송 자체를 차단한다.
 */

const API = 'https://api.telegram.org';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

/** HTML 모드 텔레그램 메시지 발송. 수신자별 성공 여부와 무관하게 계속 보낸다. */
export async function sendAdminTelegram(html: string): Promise<boolean> {
  if (process.env.VITEST) return false; // 통합 테스트가 실데이터로 돌 때 오발송 방지
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_ID ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!token || chatIds.length === 0) return false;

  let anyOk = false;
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`${API}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      anyOk = anyOk || res.ok;
    } catch {
      /* 다음 수신자 계속 */
    }
  }
  return anyOk;
}

/** 공개 포털 1:1 문의 접수 알림 — 문의 DB에 저장되는 정보 그대로 전달. */
export async function notifyInquiryEvent(q: {
  locale: string;
  name: string;
  countryCode: string;
  contact: string;
  birthDate?: string | null;
  interests?: string[];
  hospitalName?: string | null;
  memo?: string;
}): Promise<boolean> {
  const lines = [
    `<b>📩 새 1:1 문의</b> (${esc(q.locale.toUpperCase())})`,
    `이름: ${esc(q.name)} (${esc(q.countryCode)})`,
    `연락처: ${esc(q.contact)}`,
  ];
  if (q.birthDate) lines.push(`생년월일: ${esc(q.birthDate)}`);
  if (q.interests && q.interests.length > 0) lines.push(`관심 분야: ${esc(q.interests.join(', '))}`);
  if (q.hospitalName) lines.push(`관심 병원: ${esc(q.hospitalName)}`);
  if (q.memo?.trim()) lines.push('', esc(q.memo.trim().slice(0, 800)));
  lines.push('', 'https://www.glowuptour.com/agency/inbox');
  return sendAdminTelegram(lines.join('\n'));
}

/** 신규 회원 가입 알림 — OAuth·이메일 인증 콜백에서 1회. */
export async function notifySignupEvent(q: {
  email: string;
  name?: string | null;
  kind: 'general' | 'biz';
  refLabel?: string | null;
}): Promise<boolean> {
  const lines = [
    `<b>🙋 새 회원 가입</b> (${q.kind === 'biz' ? 'BIZ · 파트너 센터' : '일반 · 공개 포털'})`,
    esc(q.email),
  ];
  if (q.name) lines.push(`이름: ${esc(q.name)}`);
  if (q.refLabel) lines.push(`총판·추천 경유: ${esc(q.refLabel)}`);
  lines.push('', 'https://www.glowuptour.com/master/members');
  return sendAdminTelegram(lines.join('\n'));
}

/** 리드 마켓 열람(DB 판매) 알림 — 병원이 국내 문의를 건당 구매한 시점. */
export async function notifyLeadUnlockEvent(q: {
  orgName: string;
  priceWon: number;
  interestKey: string;
  balanceKrw: number;
}): Promise<boolean> {
  const lines = [
    '<b>🔓 리드 DB 판매</b>',
    `병원: ${esc(q.orgName)}`,
    `열람가: ${won(q.priceWon)} (${esc(q.interestKey)}) · 남은 잔액: ${won(q.balanceKrw)}`,
    '',
    'https://www.glowuptour.com/master/lead-topups',
  ];
  return sendAdminTelegram(lines.join('\n'));
}

/** 총판 실적 알림 — 수당 원장 생성(마진 적립·수수료 정산·실적 등록) 시. */
export async function notifyDistributorAccrual(q: {
  kind: '여행 마진 적립' | '병원 수수료 정산' | '실적 등록';
  distributorLabel: string;
  invoiceNo: string;
  baseWon: number;
  amountWon: number;
}): Promise<boolean> {
  const lines = [
    `<b>📈 총판 실적 — ${q.kind}</b>`,
    `총판: ${esc(q.distributorLabel)}`,
    `<code>${esc(q.invoiceNo)}</code> · 기준액 ${won(q.baseWon)} → 수당 ${won(q.amountWon)}`,
    '',
    'https://www.glowuptour.com/master/partners',
  ];
  return sendAdminTelegram(lines.join('\n'));
}

/** 총판·추천 코드로 회원이 새로 귀속된 시점 (최초 1회). */
export async function notifyAttributionEvent(q: {
  partnerLabel: string;
  source: string;
}): Promise<boolean> {
  return sendAdminTelegram(
    [`<b>👥 총판 회원 귀속</b>`, `코드: ${esc(q.partnerLabel)} · 경로: ${esc(q.source)}`].join('\n'),
  );
}

const EVENT_HEAD: Record<string, string> = {
  issued: '🧾 새 예약 인보이스',
  reported: '💰 입금 신고 — 확인 필요',
  paid: '✅ 결제 확정',
  paid_manual: '✅ 입금 확인 (관리자 처리)',
};

/** 주문 이벤트 공용 포맷 — 호출부는 알고 있는 필드만 넘기면 된다. */
export async function notifyOrderEvent(
  kind: 'issued' | 'reported' | 'paid' | 'paid_manual',
  o: {
    invoiceNo: string;
    listingTitle?: string | null;
    totalWon?: number | null;
    guests?: number | null;
    reserveDate?: string | null;
    reserveTime?: string | null;
    userEmail?: string | null;
    locale?: string | null;
    method?: string | null;
  },
): Promise<boolean> {
  const lines = [
    `<b>${EVENT_HEAD[kind] ?? kind}</b>`,
    `<code>${esc(o.invoiceNo)}</code>${o.listingTitle ? ` · ${esc(o.listingTitle)}` : ''}`,
  ];
  if (o.reserveDate) {
    lines.push(`${esc(o.reserveDate)}${o.reserveTime ? ` ${esc(o.reserveTime)}` : ''}${o.guests ? ` · ${o.guests}명` : ''}`);
  }
  if (typeof o.totalWon === 'number') {
    lines.push(`${won(o.totalWon)}${o.method ? ` · ${esc(o.method)}` : ''}${o.locale ? ` · ${esc(o.locale)}` : ''}`);
  }
  if (o.userEmail) lines.push(`회원: ${esc(o.userEmail)}`);
  lines.push('https://www.glowuptour.com/master/orders');
  return sendAdminTelegram(lines.join('\n'));
}
