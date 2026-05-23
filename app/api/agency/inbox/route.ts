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
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', issues: parsed.error.issues }, { status: 400 });
  }

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
}
