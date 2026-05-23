'use client';

import { useBrowserNotificationConsent, useInboxRealtime } from '@/lib/realtime/supabase-channels';

export function InboxRealtimeBridge({ organizationId }: { organizationId: string }): JSX.Element {
  useBrowserNotificationConsent();
  useInboxRealtime(organizationId);
  return <></>;
}
