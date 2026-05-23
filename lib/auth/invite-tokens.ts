import { SignJWT, jwtVerify } from 'jose';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { expectEnv } from '@/lib/utils/assert';
import type { AccountType } from './account-types';

const ISSUER = 'urn:earlymedi:invites';
const AUDIENCE = 'urn:earlymedi:web';

export type InviteTokenPayload = {
  organizationId: string;
  invitedEmail: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  intendedAccountType?: AccountType;
  inviteId: string;
};

function getSecret(): Uint8Array {
  return new TextEncoder().encode(expectEnv('INVITE_TOKEN_SECRET'));
}

/** Returns the raw signed JWT and its sha256 hex hash (the latter is stored). */
export async function signInviteToken(
  payload: InviteTokenPayload,
  ttlSeconds: number = 60 * 60 * 24 * 7, // 7d
): Promise<{ token: string; tokenHash: string }> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(getSecret());
  return { token, tokenHash: hashToken(token) };
}

export async function verifyInviteToken(token: string): Promise<InviteTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return {
    organizationId: String(payload.organizationId),
    invitedEmail: String(payload.invitedEmail),
    role: payload.role as InviteTokenPayload['role'],
    intendedAccountType: payload.intendedAccountType as InviteTokenPayload['intendedAccountType'],
    inviteId: String(payload.inviteId),
  };
}

export function hashToken(token: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(token)));
}
