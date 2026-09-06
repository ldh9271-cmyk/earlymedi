'use client';

/**
 * 서버 액션 폼에 확인 창 한 번 — 입금 확인·예약 확정·취소·환불처럼 되돌리기 어려운 버튼용.
 * message 안의 {필드명} 은 제출 시점의 폼 값으로 치환된다 (예: "₩{refundWon} 환불…").
 */
export default function ConfirmForm({ action, message, children, style }: {
  action: (fd: FormData) => Promise<void>; message: string; children: React.ReactNode; style?: React.CSSProperties;
}): JSX.Element {
  return (
    <form
      action={action}
      style={style}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const msg = message.replace(/\{(\w+)\}/g, (_m, k: string) => {
          const v = fd.get(k);
          const n = Number(v);
          return v == null ? '' : Number.isFinite(n) && String(v).trim() !== '' ? n.toLocaleString('ko-KR') : String(v);
        });
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
