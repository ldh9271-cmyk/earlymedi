'use client';

import { useRef, useTransition } from 'react';

/**
 * 콘솔(파트너·마스터) 보내기 폼 — 서버 액션을 transition 으로 불러 처리 중엔 입력·버튼을 잠근다(이중 제출 방지).
 * 끝나면 입력칸을 비운다. 번역이 붙는 방은 1~3초 걸릴 수 있어 '전송 중…' 을 보여 준다.
 */
export function SendForm({ roomId, sendAction, color, placeholder }: {
  roomId: string; sendAction: (formData: FormData) => Promise<void>; color: string; placeholder: string;
}): JSX.Element {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={(fd) => {
        if (pending || !String(fd.get('body') ?? '').trim()) return;
        start(async () => { await sendAction(fd); ref.current?.reset(); });
      }}
      style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #ebebeb' }}
    >
      <input type="hidden" name="roomId" value={roomId} />
      <input name="body" required maxLength={4000} placeholder={placeholder} autoComplete="off" disabled={pending}
        style={{ flex: 1, minWidth: 0, height: 40, border: '1px solid #dddddd', borderRadius: 10, padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: pending ? '#f7f7f7' : '#fff' }} />
      <button type="submit" disabled={pending}
        style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: color, color: '#fff', fontWeight: 700, fontSize: 13, cursor: pending ? 'default' : 'pointer', fontFamily: 'inherit', opacity: pending ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        {pending ? '전송 중…' : '보내기'}
      </button>
    </form>
  );
}
