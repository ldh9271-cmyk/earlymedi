import { describe, expect, it, beforeAll } from 'vitest';
import { hashToken, signInviteToken, verifyInviteToken } from '@/lib/auth/invite-tokens';

beforeAll(() => {
  process.env.INVITE_TOKEN_SECRET = 'test-secret-must-be-long-enough-for-hs256-aaaaaaaaaaaaaaaa';
});

describe('invite-tokens', () => {
  it('signs and verifies round-trip', async () => {
    const { token, tokenHash } = await signInviteToken({
      organizationId: '00000000-0000-4000-9000-000000000001',
      invitedEmail: 'invitee@earlymedi.test',
      role: 'member',
      intendedAccountType: 'freelancer',
      inviteId: 'inv_abc',
    });

    expect(token.split('.').length).toBe(3); // JWT
    expect(tokenHash).toHaveLength(64); // sha256 hex

    const payload = await verifyInviteToken(token);
    expect(payload.organizationId).toBe('00000000-0000-4000-9000-000000000001');
    expect(payload.invitedEmail).toBe('invitee@earlymedi.test');
    expect(payload.intendedAccountType).toBe('freelancer');
  });

  it('rejects tokens with a mutated payload', async () => {
    const { token } = await signInviteToken({
      organizationId: '00000000-0000-4000-9000-000000000001',
      invitedEmail: 'invitee@earlymedi.test',
      role: 'member',
      inviteId: 'inv_xyz',
    });
    const tampered = token.slice(0, -2) + 'XX';
    await expect(verifyInviteToken(tampered)).rejects.toThrow();
  });

  it('hashes deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abcd'));
  });
});
