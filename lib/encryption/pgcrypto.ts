import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Helpers around pgcrypto's pgp_sym_encrypt/decrypt. The plaintext never
 * leaves Postgres in raw form; we ship base64 strings around the app.
 *
 * `PII_ENCRYPTION_KEY` is required. Tests can stub it; runtime must set it.
 */

function key(): string {
  const k = process.env.PII_ENCRYPTION_KEY;
  if (!k) throw new Error('PII_ENCRYPTION_KEY env not set');
  return k;
}

export async function encryptPii(plaintext: string): Promise<string> {
  const result = await db.execute<{ encoded: string }>(sql`
    SELECT encode(pgp_sym_encrypt(${plaintext}, ${key()}), 'base64') AS encoded
  `);
  const rows = result as unknown as Array<{ encoded: string }>;
  const enc = rows[0]?.encoded;
  if (!enc) throw new Error('encryption_failed');
  return enc;
}

export async function decryptPii(encoded: string | null | undefined): Promise<string | null> {
  if (!encoded) return null;
  const result = await db.execute<{ plaintext: string }>(sql`
    SELECT pgp_sym_decrypt(decode(${encoded}, 'base64'), ${key()}) AS plaintext
  `);
  const rows = result as unknown as Array<{ plaintext: string }>;
  return rows[0]?.plaintext ?? null;
}

/** Hash a normalized PII string for deduplication (passport/phone/email). */
export function hashFingerprint(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '');
  return bytesToHex(sha256(new TextEncoder().encode(normalized)));
}
