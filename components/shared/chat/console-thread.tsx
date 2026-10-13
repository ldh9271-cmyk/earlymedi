import type { ChatMessage, ChatRoom } from '@/drizzle/schema/chat';
import { AutoRefresh } from './auto-refresh';

/**
 * 콘솔(파트너·마스터) 공용 대화 스레드 — 서버 컴포넌트. 보내기는 상위가 넘긴 서버 액션 폼.
 * 내 역할(me)의 말풍선은 오른쪽, 소비자는 왼쪽 회색, 다른 쪽(플랫폼/업체)은 왼쪽 색 구분.
 */
export function ConsoleThread({ room, messages, me, sendAction, extra }: {
  room: ChatRoom; messages: ChatMessage[]; me: 'business' | 'platform';
  sendAction: (formData: FormData) => Promise<void>;
  extra?: React.ReactNode;
}): JSX.Element {
  const label = (r: string): string => r === 'consumer' ? (room.userName || room.userEmail || '고객') : r === 'business' ? (room.orgName || '업체') : r === 'platform' ? '글로우업투어' : '';
  const color = (r: string): string => r === 'consumer' ? '#222' : r === 'business' ? '#1d4ed8' : '#c81e42';
  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 14, background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 420, overflow: 'hidden' }}>
      <AutoRefresh />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{room.title}</div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>
            고객 {room.userName || '-'} · {room.userEmail || '-'} · 업체 {room.orgName || '(미지정)'} · {room.status === 'closed' ? '종료' : '진행 중'} · {room.locale}
          </div>
        </div>
        {extra}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520 }}>
        {messages.length === 0 ? <div style={{ fontSize: 13, color: '#6a6a6a' }}>아직 메시지가 없습니다.</div> : null}
        {messages.map((m) => {
          const mine = m.senderRole === me;
          const sys = m.senderRole === 'system';
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: sys ? 'center' : mine ? 'flex-end' : 'flex-start' }}>
              {!sys ? <span style={{ fontSize: 11, fontWeight: 700, color: color(m.senderRole), marginBottom: 3 }}>{label(m.senderRole)}{m.senderName && m.senderRole !== 'consumer' ? ` · ${m.senderName}` : ''}</span> : null}
              <div style={{ maxWidth: '80%', background: sys ? 'transparent' : mine ? (me === 'platform' ? '#ff385c' : '#1d4ed8') : m.senderRole === 'consumer' ? '#fff' : m.senderRole === 'business' ? '#eff6ff' : '#fff5f7', color: sys ? '#9c9c9c' : mine ? '#fff' : '#222', border: mine || sys ? 'none' : '1px solid #ebebeb', borderRadius: 13, padding: sys ? '2px 6px' : '9px 12px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.body}</div>
              <span style={{ fontSize: 10, color: '#9c9c9c', marginTop: 2 }}>{new Date(m.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
      </div>
      {room.status === 'closed' ? (
        <div style={{ padding: 12, borderTop: '1px solid #ebebeb', fontSize: 13, color: '#6a6a6a', textAlign: 'center' }}>종료된 대화입니다.</div>
      ) : (
        <form action={sendAction} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #ebebeb' }}>
          <input type="hidden" name="roomId" value={room.id} />
          <input name="body" required maxLength={4000} placeholder="메시지를 입력하세요" autoComplete="off"
            style={{ flex: 1, minWidth: 0, height: 40, border: '1px solid #dddddd', borderRadius: 10, padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          <button type="submit" style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: me === 'platform' ? '#ff385c' : '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>보내기</button>
        </form>
      )}
    </div>
  );
}
