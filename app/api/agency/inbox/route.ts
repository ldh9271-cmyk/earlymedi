export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { listInboxConversations } from '@/lib/db/repositories/inbox';
import type { ChannelKind } from '@/lib/channels/types';

const Query = z.object({
  channels: z.string().optional(), // CSV
  stages: z.string().optional(),
  countries: z.string().optional(),
  unread: z.string().optional(),
  starred: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(request: Request): Promise<Response> {
  // All four account types share this inbox stack — agencies, hospitals,
  // non-medical partners (hotels, spas, etc.), and freelancers all run
  // their own KakaoTalk/LINE/WhatsApp inboxes for direct inquiries.
  const access = await tryAccess({
    allowedAccountTypes: ['agency', 'medical', 'non_medical', 'freelancer'],
  });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const data = await withRls(access.ctx, () =>
      listInboxConversations(access.ctx.orgId, {
        channelKinds: parsed.data.channels?.split(',').filter(Boolean) as ChannelKind[] | undefined,
        stages: parsed.data.stages?.split(',').filter(Boolean) as Array<'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived'> | undefined,
        countryCodes: parsed.data.countries?.split(',').filter(Boolean),
        unreadOnly: parsed.data.unread === '1',
        starredOnly: parsed.data.starred === '1',
        search: parsed.data.q,
      }),
    );
    return NextResponse.json({ data });
  } catch (err) {
    // Surface the underlying DB / SQL error to the client so the inbox UI
    // can show something more useful than "로딩 실패". Still 500 — this
    // means something is genuinely broken (schema mismatch, etc.) that
    // a "refresh" won't fix.
    const message = err instanceof Error ? err.message : 'unknown_error';
    // eslint-disable-next-line no-console
    console.error('[inbox] listInboxConversations failed:', message);
    return NextResponse.json(
      { error: 'inbox_query_failed', message },
      { status: 500 },
    );
  }
}
