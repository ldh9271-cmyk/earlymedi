import Link from 'next/link';
import { asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { getRoom, listMessages, listRoomsForPlatform, markRead } from '@/lib/chat/service';
import { ConsoleThread } from '@/components/shared/chat/console-thread';
import { AutoRefresh } from '@/components/shared/chat/auto-refresh';
import { listOperators, requireChatStaff } from '@/lib/chat/operators';
import { topicHref } from '@/lib/chat/topic-room';
import { masterAddOperatorAction, masterAssignOrgAction, masterSendAction, masterSetStatusAction, masterToggleOperatorAction } from './_actions';

export const metadata = { title: '고객 채팅 — 마스터 관리자' };
export const dynamic = 'force-dynamic';

/**
 * 마스터 + 마스터가 지정한 채팅 관리자(chat_operators) — 모든 채팅 방(예약 건·상품 문의·일반 문의). 읽지 않은 방이 위로.
 * 플랫폼으로 답한다(관리자는 '글로우업투어 · 이름'). 업체 연결·종료·관리자 지정은 마스터만.
 * 고객이 쓰면 텔레그램 알림이 온다(lib/chat/service postMessage).
 */
export default async function MasterChatsPage({ searchParams }: { searchParams: { room?: string; error?: string; ok?: string } }): Promise<JSX.Element> {
  const me = await requireChatStaff();
  const operators = me.isMaster ? await listOperators().catch(() => []) : [];

  const rooms = await listRoomsForPlatform(300);
  const room = searchParams.room ? await getRoom(searchParams.room) : null;
  const messages = room ? await listMessages(room.id) : [];
  if (room && room.platformUnread > 0) await markRead(room.id, 'platform');
  const orgs = await db.select({ id: organizations.id, name: organizations.name, accountType: organizations.accountType }).from(organizations).where(inArray(organizations.accountType, ['non_medical', 'medical'])).orderBy(asc(organizations.name)).limit(500);
  const fmt = (d: Date | null): string => d ? new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const totalUnread = rooms.reduce((a, r) => a + r.platformUnread, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <AutoRefresh everyMs={15000} />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">고객 채팅 {totalUnread > 0 ? <span style={{ marginLeft: 8, background: '#ff385c', color: '#fff', borderRadius: 999, padding: '2px 9px', fontSize: 12 }}>{totalUnread}</span> : null}</h1>
          <p className="mt-1 text-xs text-muted-foreground">소비자(사이트·앱 위젯) · 업체(파트너 콘솔 &lsquo;고객 채팅&rsquo;) · 플랫폼(여기)이 같은 방을 봅니다. 새 메시지는 15초마다 갱신됩니다.</p>
        </div>
        {me.isMaster ? <Link href="/master" className="text-xs underline">마스터 홈</Link> : <span className="text-xs text-muted-foreground">상담 관리자 · {me.email}</span>}
      </header>
      {searchParams.ok === 'operator' ? <p style={{ color: '#047857', fontSize: 13, marginBottom: 12, fontWeight: 700 }}>✅ 채팅 관리자를 저장했습니다. 그 이메일로 로그인하면 이 화면에서 답할 수 있습니다.</p> : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>처리에 실패했습니다: {searchParams.error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: room ? '340px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 760, overflowY: 'auto' }}>
          {rooms.length === 0 ? <p style={{ fontSize: 14, color: '#6a6a6a' }}>아직 채팅이 없습니다.</p> : null}
          {rooms.map((r) => (
            <Link key={r.id} href={`/master/chats?room=${r.id}`} style={{ textDecoration: 'none', color: '#222', border: `1px solid ${room?.id === r.id ? '#ff385c' : '#ebebeb'}`, background: room?.id === r.id ? '#fff5f7' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kind === 'support' ? `일반 문의 · ${r.userName || r.userEmail || ''}` : r.title}</span>
                {r.platformUnread > 0 ? <span style={{ background: '#ff385c', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{r.platformUnread}</span> : null}
              </span>
              <span style={{ fontSize: 12, color: '#6a6a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.userName || r.userEmail || '고객'} · {r.orgName ?? '업체 미지정'} · {r.lastMessagePreviewKo || r.lastMessagePreview || '대화 없음'}</span>
              <span style={{ fontSize: 11, color: '#9c9c9c' }}>{fmt(r.lastMessageAt)}{r.status === 'closed' ? ' · 종료' : ''}{r.businessUnread > 0 ? ` · 업체 미읽음 ${r.businessUnread}` : ''}</span>
            </Link>
          ))}
        </div>
        {room ? (
          <ConsoleThread room={room} messages={messages} me="platform" sendAction={masterSendAction}
            extra={me.isMaster ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <form action={masterAssignOrgAction} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <select name="orgId" defaultValue={room.orgId ?? ''} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '6px 8px', fontSize: 12, maxWidth: 220 }}>
                    <option value="">업체 미지정</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button type="submit" style={{ border: '1px solid #222', background: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>업체 연결</button>
                </form>
                <form action={masterSetStatusAction}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <input type="hidden" name="status" value={room.status === 'closed' ? 'open' : 'closed'} />
                  <button type="submit" style={{ border: '1px solid #dddddd', background: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{room.status === 'closed' ? '다시 열기' : '대화 종료'}</button>
                </form>
                {room.orderId ? <Link href={`/master/orders?q=${encodeURIComponent(room.title.split(' · ').pop() ?? '')}`} style={{ fontSize: 12, textDecoration: 'underline' }}>주문 보기</Link> : null}
                {room.kind === 'topic' && room.listingSlug ? <Link href={topicHref(room.listingSlug, room.locale) ?? '#'} target="_blank" style={{ fontSize: 12, textDecoration: 'underline' }}>페이지 보기</Link>
                  : room.listingSlug ? <Link href={`/${room.locale}/listings/${room.listingSlug}`} target="_blank" style={{ fontSize: 12, textDecoration: 'underline' }}>상품 보기</Link> : null}
              </div>
            ) : undefined} />
        ) : null}
      </div>

      {me.isMaster ? (
        <section style={{ marginTop: 28, border: '1px solid #ebebeb', borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>채팅 상담 관리자</h2>
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 12px', lineHeight: 1.6 }}>여기 등록한 이메일로 사이트에 로그인하면 /master/chats 에서 플랫폼(글로우업투어 · 이름)으로 답할 수 있습니다. 업체 연결·종료·관리자 지정은 마스터만 할 수 있습니다. 사이트 회원 가입이 먼저 되어 있어야 로그인됩니다.</p>
          <form action={masterAddOperatorAction} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input name="email" type="email" required placeholder="관리자 이메일" style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 240 }} />
            <input name="name" placeholder="표시 이름 (예: 김상담)" maxLength={40} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 160 }} />
            <button type="submit" style={{ border: 'none', background: '#222', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>추가 · 저장</button>
          </form>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {operators.length === 0 ? <span style={{ fontSize: 12, color: '#6a6a6a' }}>등록된 관리자가 없습니다. 지금은 마스터만 답합니다.</span> : null}
            {operators.map((o) => (
              <div key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, opacity: o.active === 1 ? 1 : 0.5 }}>
                <span style={{ fontWeight: 700 }}>{o.name || '-'}</span>
                <span style={{ color: '#6a6a6a' }}>{o.email}</span>
                <span style={{ fontSize: 11, color: o.active === 1 ? '#047857' : '#9c9c9c' }}>{o.active === 1 ? '활성' : '비활성'}</span>
                <form action={masterToggleOperatorAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="active" value={o.active === 1 ? '0' : '1'} />
                  <button type="submit" style={{ border: '1px solid #dddddd', background: '#fff', borderRadius: 8, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>{o.active === 1 ? '비활성화' : '활성화'}</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
