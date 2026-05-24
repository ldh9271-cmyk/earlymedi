'use server';

import 'server-only';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { channels } from '@/drizzle/schema/channels';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { auditLogs } from '@/drizzle/schema/audit';
import { encryptPii } from '@/lib/encryption/pgcrypto';
import { CHANNELS, type ChannelKind } from './registry';

/**
 * Server actions for the /agency/channels page: connect a new messenger
 * account, disconnect / pause one, and list what's currently connected.
 *
 * Credentials live in `channels.credentialsEncrypted` (pgcrypto pgp_sym_*).
 * The plaintext leaves the request only as the form payload — never
 * persisted unencrypted and never returned to the client.
 */

const ConnectInputSchema = z.object({
  kind: z.enum([
    'kakao',
    'line',
    'telegram',
    'whatsapp',
    'instagram',
    'messenger',
    'naver',
    'wechat',
  ]),
  displayName: z.string().min(1).max(120),
  externalAccountId: z.string().min(1).max(200),
  credentials: z.record(z.string(), z.string()),
});

export type ConnectChannelInput = z.infer<typeof ConnectInputSchema>;

async function requireOrgOwnerOrAdmin(): Promise<{ userId: string; orgId: string }> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const [m] = await db
    .select({ orgId: orgMemberships.organizationId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, auth.user.id),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(1);
  if (!m) throw new Error('no_membership');
  if (!['owner', 'admin', 'manager'].includes(m.role)) throw new Error('insufficient_role');
  return { userId: auth.user.id, orgId: m.orgId };
}

export async function connectChannelAction(rawInput: ConnectChannelInput): Promise<{
  channelId: string;
  webhookUrl: string;
}> {
  const input = ConnectInputSchema.parse(rawInput);
  const def = CHANNELS[input.kind as ChannelKind];
  if (!def.ready) {
    throw new Error('channel_not_ready');
  }

  const { userId, orgId } = await requireOrgOwnerOrAdmin();

  // Validate that every required credential field has a non-empty value.
  for (const field of def.credentialFields) {
    // Treat any field whose Korean label contains "선택" as optional.
    if (field.label.includes('선택')) continue;
    const value = input.credentials[field.key];
    if (!value || value.trim() === '') {
      throw new Error(`missing_credential:${field.key}`);
    }
  }

  // Encrypt the whole credentials bag as a single JSON blob.
  const encrypted = await encryptPii(JSON.stringify(input.credentials));

  const [row] = await db
    .insert(channels)
    .values({
      organizationId: orgId,
      kind: input.kind,
      displayName: input.displayName,
      externalAccountId: input.externalAccountId,
      status: 'connected',
      credentialsEncrypted: encrypted,
      lastSyncAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [channels.organizationId, channels.kind, channels.externalAccountId],
      set: {
        displayName: input.displayName,
        status: 'connected',
        credentialsEncrypted: encrypted,
        lastSyncAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: channels.id });

  if (!row) throw new Error('channel_save_failed');

  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'create',
    entityType: 'channel',
    entityId: row.id,
    diff: { kind: input.kind, displayName: input.displayName },
    metadata: { externalAccountId: input.externalAccountId },
  });

  // Build the webhook URL the user pastes back into the messenger's console.
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://earlymedi.vercel.app');
  const webhookUrl = `${appBase}${def.webhookPath}?org=${orgId}&channel=${row.id}`;

  return { channelId: row.id, webhookUrl };
}

export async function disconnectChannelAction(channelId: string): Promise<void> {
  const { userId, orgId } = await requireOrgOwnerOrAdmin();
  await db
    .update(channels)
    .set({ status: 'disconnected', updatedAt: new Date() })
    .where(and(eq(channels.id, channelId), eq(channels.organizationId, orgId)));

  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'update',
    entityType: 'channel',
    entityId: channelId,
    metadata: { reason: 'disconnected' },
  });
}

export async function listChannelsForOrg(orgId: string): Promise<
  Array<{
    id: string;
    kind: string;
    displayName: string;
    externalAccountId: string;
    status: string;
    lastSyncAt: Date | null;
    lastErrorMessage: string | null;
  }>
> {
  return await db
    .select({
      id: channels.id,
      kind: channels.kind,
      displayName: channels.displayName,
      externalAccountId: channels.externalAccountId,
      status: channels.status,
      lastSyncAt: channels.lastSyncAt,
      lastErrorMessage: channels.lastErrorMessage,
    })
    .from(channels)
    .where(eq(channels.organizationId, orgId));
}
