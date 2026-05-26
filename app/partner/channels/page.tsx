import { requireAccess } from '@/lib/auth/route-guards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ChannelCard } from '@/components/shared/channels/channel-card';
import { CHANNEL_ORDER, type ChannelKind } from '@/lib/channels/registry';
import { listChannelsForOrg } from '@/lib/channels/actions';

export const metadata = { title: '파트너 채널 연결' };
export const dynamic = 'force-dynamic';

/**
 * Partner channel connector. Same 8-messenger grid as agency/medical.
 * Hotels, spas and restaurants frequently get direct guest inquiries
 * via KakaoTalk (domestic + Korean-speaking guests), WeChat (Chinese),
 * LINE (Japanese / SE Asia) — wiring them in here keeps all four
 * tenants on a consistent messenger stack.
 */
export default async function PartnerChannelsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  let connected: Awaited<ReturnType<typeof listChannelsForOrg>> = [];
  try {
    connected = await listChannelsForOrg(ctx.orgId);
  } catch {
    // DB unreachable → render grid as if nothing is connected.
  }

  const byKind = new Map(connected.map((c) => [c.kind, c]));
  const connectedCount = connected.filter((c) => c.status === 'connected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="slate" className="mb-2">
            🔌 채널 연결
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">파트너 다국어 메신저 인박스</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            카카오톡 · LINE · WhatsApp · WeChat 등 외국인 게스트가 직접 시설에 문의·예약하는 채널을 연결하세요. Agency를 거치지 않는 직접 예약도 한 곳에서 관리할 수 있습니다.
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">시작 가이드</CardTitle>
          <CardDescription className="text-xs">
            대상 고객 국적에 맞는 메신저부터 연결하세요. 한국·일본 게스트는 KakaoTalk·LINE, 중국 게스트는 WeChat, 영어권은 WhatsApp이 가장 효과적입니다.
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
              파트너 인박스에 새 문의가 들어오면 AI가 자동으로 번역하고 의도를 분류합니다
            </li>
          </ol>
        </CardContent>
      </Card>

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
        💡 <strong>참고:</strong> KakaoTalk만 실제 연결이 가능합니다. 다른 7개 채널은 콘솔 자격증명 폼은 보이지만 메시지 수신은 곧 활성화됩니다.
        WhatsApp · WeChat은 외국 법인 인증으로 가입 승인이 1~4주 걸리는 점 참고하세요.
      </div>
    </div>
  );
}
