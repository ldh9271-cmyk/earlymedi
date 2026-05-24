'use client';

import { useState } from 'react';
import { Check, AlertCircle, ExternalLink, Plug, PowerOff } from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { CHANNELS, type ChannelKind } from '@/lib/channels/registry';
import { ChannelConnectDialog } from './channel-connect-dialog';
import { CHANNEL_ICONS } from './channel-icons';

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
  const [dialogOpen, setDialogOpen] = useState(false);

  const isConnected = connected?.status === 'connected';
  const hasError = connected?.status === 'error';

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

          {/* Actions */}
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
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
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

