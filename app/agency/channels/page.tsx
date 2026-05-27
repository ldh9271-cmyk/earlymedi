import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ChannelCard } from '@/components/shared/channels/channel-card';
import { CHANNEL_ORDER, type ChannelKind } from '@/lib/channels/registry';
import { listChannelsForOrg } from '@/lib/channels/actions';

export const metadata = { title: '채널 연결' };
export const dynamic = 'force-dynamic';

export default async function AgencyChannelsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  let connected: Awaited<ReturnType<typeof listChannelsForOrg>> = [];
  try {
    connected = await listChannelsForOrg(ctx.orgId);
  } catch {
    // DB unreachable → render the grid as if nothing is connected.
  }

  // Index connected channels by kind for O(1) lookup in the grid.
  const byKind = new Map(connected.map((c) => [c.kind, c]));

  const connectedCount = connected.filter((c) => c.status === 'connected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="brand" className="mb-2">
            🔌 채널 연결
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">10채널 다국어 인박스</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            카카오톡 · LINE · WhatsApp · Telegram 등 8개 메신저를 연결해 한 인박스에서 응대하세요. 각 채널에서 발급받은 키를 등록하면 즉시 메시지를 수신합니다.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">활성 채널</div>
          <div className="text-2xl font-bold">
            {connectedCount}
            <span className="text-base font-normal text-muted-foreground"> / 8</span>
          </div>
        </div>
      </div>

      {/* Setup guidance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">시작 가이드</CardTitle>
          <CardDescription className="text-xs">
            첫 채널 연결은 보통 KakaoTalk부터 시작합니다 (한국 환자 70%+).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">①</span>
              연결할 채널 카드의 <strong className="text-foreground">&quot;연결하기&quot;</strong> 클릭
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">②</span>
              해당 메신저의 개발자 콘솔에서 API 키 / 토큰을 발급받아 입력 (각 카드의 외부 링크 아이콘 참고)
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">③</span>
              저장 후 표시되는 <strong className="text-foreground">Webhook URL</strong>을 콘솔에 등록하면 메시지 수신 시작
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">④</span>
              인박스에 새 대화가 들어오면 AI가 자동으로 다국어 번역 + 의도 분류
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Channel grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {CHANNEL_ORDER.map((kind) => {
          const row = byKind.get(kind);
          return (
            <ChannelCard
              key={kind}
              kind={kind as ChannelKind}
              connected={
                row
                  ? {
                      id: row.id,
                      kind: row.kind,
                      displayName: row.displayName,
                      externalAccountId: row.externalAccountId,
                      status: row.status,
                      lastSyncAt: row.lastSyncAt,
                      lastErrorMessage: row.lastErrorMessage,
                    }
                  : null
              }
            />
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        💡 <strong>참고:</strong> KakaoTalk · WeChat OA 실제 연결이 가능합니다. 다른 6개 채널은 콘솔 자격증명 폼은 보이지만 메시지 수신은 곧 활성화됩니다.
        WhatsApp · WeChat은 외국 법인 인증으로 가입 승인이 1~4주 걸리는 점 참고하세요.
      </div>
    </div>
  );
}
