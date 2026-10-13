import type { ChatMessage, ChatRoom } from '@/drizzle/schema/chat';
import { chatLangLabel, chatTargetTag } from '@/lib/chat/translate';
import { AutoRefresh } from './auto-refresh';
import { SendForm } from './send-form';

/**
 * 콘솔(파트너·마스터) 공용 대화 스레드 — 서버 컴포넌트. 보내기는 상위가 넘긴 서버 액션 폼(SendForm, 이중 제출 잠금).
 * 내 역할(me)의 말풍선은 오른쪽, 소비자는 왼쪽 회색, 다른 쪽(플랫폼/업체)은 왼쪽 색 구분.
 * 번역 방(고객 언어 ≠ 한국어): 말풍선엔 한국어(body_ko)를 크게, 그 아래 작게 고객 언어 원문(고객 글) 또는 실제 전달된 번역문(내 글)을 보여 준다.
 */
export function ConsoleThread({ room, messages, me, sendAction, extra }: {
  room: ChatRoom; messages: ChatMessage[]; me: 'business' | 'platform';
  sendAction: (formData: FormData) => Promise<void>;
  extra?: React.ReactNode;
}): JSX.Element {
  const label = (r: string): string => r === 'consumer' ? (room.userName || room.userEmail || '고객') : r === 'business' ? (room.orgName || '업체') : r === 'platform' ? '글로우업투어' : '';
  const color = (r: string): string => r === 'consumer' ? '#222' : r === 'business' ? '#1d4ed8' : '#c81e42';
  const target = chatTargetTag(room.locale);
  const translating = target !== 'ko';
  const targetLabel = chatLangLabel(target);
  const myColor = me === 'platform' ? '#ff385c' : '#1d4ed8';
  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 14, background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 420, overflow: 'hidden' }}>
      <AutoRefresh />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{room.title}</div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>
            고객 {room.userName || '-'} · {room.userEmail || '-'} · 업체 {room.orgName || '(미지정)'} · {room.status === 'closed' ? '종료' : '진행 중'} · {room.locale}
            {translating ? <span style={{ marginLeft: 8, background: '#eef6ff', color: '#1d4ed8', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>🌐 고객 언어 {targetLabel} · AI 자동 번역</span> : null}
          </div>
        </div>
        {extra}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520 }}>
        {messages.length === 0 ? <div style={{ fontSize: 13, color: '#6a6a6a' }}>아직 메시지가 없습니다.</div> : null}
        {messages.map((m) => {
          const mine = m.senderRole === me;
          const sys = m.senderRole === 'system';
          const main = m.bodyKo ?? m.body;
          const hasPair = !!m.bodyKo && m.bodyKo !== m.body;
          const subLabel = m.senderRole === 'consumer' ? `원문 · ${chatLangLabel(m.bodyLang) || '고객 언어'}` : `고객에게 전달 · ${chatLangLabel(m.bodyLang) || targetLabel}`;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: sys ? 'center' : mine ? 'flex-end' : 'flex-start' }}>
              {!sys ? <span style={{ fontSize: 11, fontWeight: 700, color: color(m.senderRole), marginBottom: 3 }}>{label(m.senderRole)}{m.senderName && m.senderRole !== 'consumer' ? ` · ${m.senderName}` : ''}{hasPair ? ' · 🌐 번역' : ''}</span> : null}
              <div style={{ maxWidth: '80%', background: sys ? 'transparent' : mine ? myColor : m.senderRole === 'consumer' ? '#fff' : m.senderRole === 'business' ? '#eff6ff' : '#fff5f7', color: sys ? '#9c9c9c' : mine ? '#fff' : '#222', border: mine || sys ? 'none' : '1px solid #ebebeb', borderRadius: 13, padding: sys ? '2px 6px' : '9px 12px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {main}
                {hasPair ? (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${mine ? 'rgba(255,255,255,0.45)' : '#dddddd'}`, fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>
                    <span style={{ fontWeight: 700 }}>{subLabel}</span><br />{m.body}
                  </div>
                ) : null}
              </div>
              <span style={{ fontSize: 10, color: '#9c9c9c', marginTop: 2 }}>{new Date(m.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
      </div>
      {room.status === 'closed' ? (
        <div style={{ padding: 12, borderTop: '1px solid #ebebeb', fontSize: 13, color: '#6a6a6a', textAlign: 'center' }}>종료된 대화입니다.</div>
      ) : (
        <SendForm roomId={room.id} sendAction={sendAction} color={myColor}
          placeholder={translating ? `한국어로 쓰면 ${targetLabel}로 번역되어 고객에게 전달됩니다` : '메시지를 입력하세요'} />
      )}
    </div>
  );
}
