import 'server-only';

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
