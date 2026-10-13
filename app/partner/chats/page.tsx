import Link from 'next/link';
import { requireAccess } from '@/lib/auth/route-guards';
import { getRoom, listMessages, listRoomsForOrg, markRead } from '@/lib/chat/service';
import { ConsoleThread } from '@/components/shared/chat/console-thread';
import { AutoRefresh } from '@/components/shared/chat/auto-refresh';
import { partnerSendAction } from './_actions';

export const metadata = { title: '고객 채팅' };
export const dynamic = 'force-dynamic';

/**
 * 파트너 콘솔 — 내 상품의 예약 건에 붙은 고객 채팅. 같은 방을 고객(사이트·앱 위젯)과 플랫폼(마스터)이 함께 본다.
 * 새 메시지는 8초마다 자동 갱신(폴링). 결제·환불 등은 기존 '예약 요청 · 견적' 화면에서.
 */
export default async function PartnerChatsPage({ searchParams }: { searchParams: { room?: string; error?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical', 'medical'] });
  const rooms = await listRoomsForOrg(ctx.orgId);
  const active = searchParams.room ? rooms.find((r) => r.id === searchParams.room) ?? null : null;
  const room = active ? await getRoom(active.id) : null;
  const messages = room ? await listMessages(room.id) : [];
  if (room && room.businessUnread > 0) await markRead(room.id, 'business');
  const fmt = (d: Date | null): string => d ? new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <AutoRefresh everyMs={15000} />
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>고객 채팅</h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>
        내 상품으로 예약한 고객과의 대화입니다. 글로우업투어 담당자도 같은 방을 보고 함께 답합니다. 일정·준비물 같은 안내는 여기서, 금액·결제는 &lsquo;예약 요청 · 견적&rsquo;에서 처리해 주세요.
      </p>
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>처리에 실패했습니다: {searchParams.error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: room ? '320px 1fr' : '1fr', gap: 16, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rooms.length === 0 ? <p style={{ fontSize: 14, color: '#6a6a6a' }}>아직 고객 채팅이 없습니다. 고객이 마이페이지의 &lsquo;채팅 문의&rsquo;를 누르면 여기에 생깁니다.</p> : null}
          {rooms.map((r) => (
            <Link key={r.id} href={`/partner/chats?room=${r.id}`} style={{ textDecoration: 'none', color: '#222', border: `1px solid ${room?.id === r.id ? '#1d4ed8' : '#ebebeb'}`, background: room?.id === r.id ? '#eff6ff' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                {r.businessUnread > 0 ? <span style={{ background: '#1d4ed8', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{r.businessUnread}</span> : null}
              </span>
              <span style={{ fontSize: 12, color: '#6a6a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.userName || r.userEmail || '고객'} · {r.lastMessagePreviewKo || r.lastMessagePreview || '대화 없음'}</span>
              <span style={{ fontSize: 11, color: '#9c9c9c' }}>{fmt(r.lastMessageAt)}{r.status === 'closed' ? ' · 종료' : ''}</span>
            </Link>
          ))}
        </div>
        {room ? <ConsoleThread room={room} messages={messages} me="business" sendAction={partnerSendAction} /> : null}
      </div>
    </div>
  );
}
