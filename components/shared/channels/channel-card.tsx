'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, AlertCircle, ExternalLink, Plug, PowerOff, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { CHANNELS, type ChannelKind } from '@/lib/channels/registry';
import { sendTestMessageAction, type TestMessageLocale } from '@/lib/channels/actions';
import { ChannelConnectDialog } from './channel-connect-dialog';
import { CHANNEL_ICONS } from './channel-icons';

/** Test-message language buttons rendered below each connected channel. */
const TEST_LOCALES: ReadonlyArray<{
  code: TestMessageLocale;
  flag: string;
  label: string;
  short: string;
}> = [
  { code: 'ko', flag: '🇰🇷', label: '한국어', short: 'KO' },
  { code: 'en', flag: '🇺🇸', label: 'English', short: 'EN' },
  { code: 'zh', flag: '🇨🇳', label: '中文', short: 'ZH' },
  { code: 'ja', flag: '🇯🇵', label: '日本語', short: 'JA' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', short: 'RU' },
];

type ConnectedChannel = {
  id: string;
  kind: string;
  displayName: string;
  externalAccountId: string;
  status: string;
  lastSyncAt: Date | null;
  lastErrorMessage: string | null;
};

export function ChannelCard({
  kind,
  connected,
}: {
  kind: ChannelKind;
  connected: ConnectedChannel | null;
}): JSX.Element {
  const def = CHANNELS[kind];
  const Icon = CHANNEL_ICONS[kind];
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTestPending, startTestTransition] = useTransition();

  const isConnected = connected?.status === 'connected';
  const hasError = connected?.status === 'error';

  function handleTest(locale: TestMessageLocale): void {
    if (!connected) return;
    startTestTransition(async () => {
      try {
        const result = await sendTestMessageAction(connected.id, locale);
        const label = TEST_LOCALES.find((l) => l.code === result.locale)?.label ?? locale;
        toast.success(`${label} 테스트 메시지가 인박스에 도착했습니다.`, {
          action: { label: '인박스 열기', onClick: () => router.push('/agency/inbox') },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '테스트 실패');
      }
    });
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="space-y-3 p-4">
          {/* Header: icon + name + status */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: def.color }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{def.label}</h3>
                {isConnected ? (
                  <Badge variant="care" className="shrink-0">
                    <Check className="mr-0.5 h-2.5 w-2.5" /> 연결됨
                  </Badge>
                ) : hasError ? (
                  <Badge variant="destructive" className="shrink-0">
                    <AlertCircle className="mr-0.5 h-2.5 w-2.5" /> 오류
                  </Badge>
                ) : !def.ready ? (
                  <Badge variant="outline" className="shrink-0">준비 중</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {def.description}
              </p>
            </div>
          </div>

          {/* Connected detail (if any) */}
          {connected ? (
            <div className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-[11px]">
              <div className="font-mono text-foreground">{connected.externalAccountId}</div>
              {connected.lastErrorMessage ? (
                <div className="mt-0.5 text-destructive">{connected.lastErrorMessage}</div>
              ) : null}
            </div>
          ) : null}

          {/* Primary actions row */}
          <div className="flex items-center gap-2">
            {def.ready ? (
              <Button
                type="button"
                size="sm"
                variant={isConnected ? 'outline' : 'brand'}
                onClick={() => setDialogOpen(true)}
                className="flex-1"
              >
                {isConnected ? (
                  <>
                    <PowerOff className="mr-1 h-3 w-3" /> 재연결
                  </>
                ) : (
                  <>
                    <Plug className="mr-1 h-3 w-3" /> 연결하기
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled className="flex-1">
                곧 활성화 예정
              </Button>
            )}
            <a
              href={def.devConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-card px-2 text-[11px] text-muted-foreground transition hover:bg-muted"
              title="개발자 콘솔 열기"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Per-locale test message buttons — appear only when connected */}
          {isConnected ? (
            <div className="space-y-1.5 rounded-md border bg-muted/20 px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Send className="h-2.5 w-2.5" />
                  테스트 메시지 발송
                </span>
                {isTestPending ? <span className="text-foreground">전송 중…</span> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {TEST_LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleTest(l.code)}
                    disabled={isTestPending}
                    title={`${l.label}로 시뮬레이션 환자 메시지 발송`}
                    aria-label={`${l.label} 테스트 메시지`}
                    className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-[11px] font-medium transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                  >
                    <span className="text-sm leading-none">{l.flag}</span>
                    <span className="text-muted-foreground">{l.short}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ChannelConnectDialog
        kind={kind}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingChannelId={connected?.id ?? null}
      />
    </>
  );
}

