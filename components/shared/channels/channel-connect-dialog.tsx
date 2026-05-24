'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { CHANNELS, type ChannelKind } from '@/lib/channels/registry';
import { connectChannelAction } from '@/lib/channels/actions';
import { CHANNEL_ICONS } from './channel-icons';

export function ChannelConnectDialog({
  kind,
  open,
  onOpenChange,
  existingChannelId,
}: {
  kind: ChannelKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingChannelId: string | null;
}): JSX.Element | null {
  const def = CHANNELS[kind];
  const Icon = CHANNEL_ICONS[kind];
  const [displayName, setDisplayName] = useState('');
  const [externalAccountId, setExternalAccountId] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function close(): void {
    setError(null);
    setWebhookUrl(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await connectChannelAction({
          kind,
          displayName,
          externalAccountId,
          credentials,
        });
        setWebhookUrl(result.webhookUrl);
        toast.success(`${def.label} 연결 정보가 저장되었습니다. 아래 Webhook URL을 콘솔에 등록하세요.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : '연결 실패');
      }
    });
  }

  async function copyWebhook(): Promise<void> {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('Webhook URL을 클립보드에 복사했습니다.');
    } catch {
      toast.error('복사 실패 — 수동으로 복사해 주세요.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: def.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{def.label} 연결</h2>
              <p className="text-[11px] text-muted-foreground">
                {existingChannelId ? '재연결' : '신규 연결'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {!webhookUrl ? (
            <>
              {/* Step 1: dev console pointer */}
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
                <p className="font-semibold text-brand-900">📋 시작 전 준비</p>
                <p className="mt-1 text-brand-900/80">
                  {kind === 'kakao' ? (
                    <>
                      <a
                        href={def.devConsoleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline"
                      >
                        Kakao Developers 콘솔 <ExternalLink className="h-3 w-3" />
                      </a>
                      에 로그인해 앱을 생성하고 다음을 확보하세요:
                      <span className="mt-1 block space-y-0.5 pl-3">
                        <span className="block">① 내 애플리케이션 → 앱 설정 → 앱 키 → REST API 키</span>
                        <span className="block">② 카카오톡 채널 관리자센터에서 채널 ID (@earlymedi)</span>
                        <span className="block">③ 카카오 비즈니스 인증 (선택 — 메시지 발송 시 필요)</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <a
                        href={def.devConsoleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline"
                      >
                        {def.label} 개발자 콘솔 <ExternalLink className="h-3 w-3" />
                      </a>
                      에서 아래 값들을 발급받아 입력하세요.
                    </>
                  )}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">표시 이름</Label>
                  <Input
                    id="displayName"
                    placeholder={`예) ${def.label} — 메인`}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    인박스 사이드바에서 이 이름으로 표시됩니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="externalAccountId">
                    {kind === 'kakao' ? '카카오 채널 ID' : '계정 ID'}
                  </Label>
                  <Input
                    id="externalAccountId"
                    placeholder={kind === 'kakao' ? '@earlymedi' : 'account-id'}
                    value={externalAccountId}
                    onChange={(e) => setExternalAccountId(e.target.value)}
                    required
                  />
                </div>

                {def.credentialFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={credentials[field.key] ?? ''}
                      onChange={(e) =>
                        setCredentials((cur) => ({ ...cur, [field.key]: e.target.value }))
                      }
                      required={!field.label.includes('선택')}
                      autoComplete="off"
                    />
                    {field.helpText ? (
                      <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
                    ) : null}
                  </div>
                ))}

                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {translateError(error)}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                    취소
                  </Button>
                  <Button type="submit" variant="brand" disabled={isPending}>
                    {isPending ? '저장 중…' : '연결 정보 저장'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: webhook URL */}
              <div className="rounded-lg border border-care-300 bg-care-50 p-3 text-xs">
                <p className="font-semibold text-care-900">✅ 연결 정보 저장 완료</p>
                <p className="mt-1 text-care-900/80">
                  마지막으로 아래 Webhook URL을 {def.label} 개발자 콘솔의 메시지 webhook 설정에 등록하면 메시지 수신이 시작됩니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-1.5">
                  <Input value={webhookUrl} readOnly className="font-mono text-[11px]" />
                  <Button type="button" size="sm" variant="outline" onClick={copyWebhook}>
                    <Copy className="mr-1 h-3 w-3" /> 복사
                  </Button>
                </div>
              </div>

              {kind === 'kakao' ? (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">카카오 콘솔 등록 위치</p>
                  <ol className="space-y-1 pl-3">
                    <li>① Kakao Developers → 내 애플리케이션 → 해당 앱</li>
                    <li>② 좌측 메뉴 &quot;카카오톡 채널&quot; → 챗봇 / 메시지 webhook 설정</li>
                    <li>③ 위 URL을 &quot;Webhook URL&quot; 입력란에 붙여넣기</li>
                    <li>④ 저장 + 활성화</li>
                  </ol>
                </div>
              ) : null}

              <div className="flex justify-end border-t pt-3">
                <Button type="button" variant="brand" onClick={close}>
                  완료
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function translateError(code: string): string {
  if (code.startsWith('missing_credential:')) {
    return '필수 자격 증명이 누락되었습니다.';
  }
  switch (code) {
    case 'unauthenticated':
      return '로그인이 필요합니다.';
    case 'insufficient_role':
      return '채널 연결은 소유자 · 관리자 · 매니저 권한만 가능합니다.';
    case 'channel_not_ready':
      return '이 채널은 곧 활성화될 예정입니다.';
    case 'channel_save_failed':
      return '저장 실패. 잠시 후 다시 시도해 주세요.';
    default:
      return code;
  }
}
