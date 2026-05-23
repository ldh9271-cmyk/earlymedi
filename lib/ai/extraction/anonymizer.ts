import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { aiAnonymizationTokens } from '@/drizzle/schema/ai';

/**
 * PII anonymization for AI calls.
 *
 * Rule: nothing identifying a real person reaches an external AI provider in
 * cleartext. Before every outbound prompt, PII is replaced with `[[KIND_n]]`
 * placeholders and the originals are stored encrypted in
 * `ai_anonymization_tokens` with a short TTL (default 1 hour). After the
 * model response returns, placeholders are swapped back.
 *
 * Encryption uses Postgres `pgcrypto` (`PII_ENCRYPTION_KEY` from env) so that
 * even a DB compromise without the key cannot reverse the tokens.
 */

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

const PATTERNS: Array<{ kind: string; rx: RegExp; capture?: number }> = [
  // Email
  { kind: 'EMAIL', rx: /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi },
  // Korean RRN (주민등록번호) e.g. 850101-1234567
  { kind: 'RRN_KR', rx: /(\d{6}-\d{7})/g },
  // International / Korean phone numbers (loose)
  { kind: 'PHONE', rx: /(\+?\d{1,3}[ -]?\d{2,4}[ -]?\d{3,4}[ -]?\d{3,4})/g },
  // Passport numbers (1 letter + 8 digits, or 2 letters + 7 digits — varies by country)
  { kind: 'PASSPORT', rx: /\b([A-Z]{1,2}\d{7,8})\b/g },
  // 외국인등록번호 (alien registration) — same shape as RRN essentially; covered above.
  // Credit card-ish 16 digits
  { kind: 'CARD', rx: /\b(\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4})\b/g },
];

export type AnonymizationResult = {
  jobToken: string;
  redacted: string;
  /** placeholder → encrypted original (also persisted to DB). */
  tokenMap: Record<string, { piiKind: string }>;
};

/**
 * Replaces detected PII in `text` with placeholders and stores the originals
 * encrypted with pgcrypto using the env-supplied PII_ENCRYPTION_KEY.
 */
export async function anonymize(
  organizationId: string,
  text: string,
  options?: { ttlSeconds?: number; extraNames?: string[] },
): Promise<AnonymizationResult> {
  const jobToken = nanoid(16);
  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  let redacted = text;
  const counters: Record<string, number> = {};
  const inserts: Array<{ placeholder: string; original: string; piiKind: string }> = [];

  // Pattern-based redaction
  for (const { kind, rx } of PATTERNS) {
    redacted = redacted.replace(rx, (match) => {
      counters[kind] = (counters[kind] ?? 0) + 1;
      const placeholder = `[[${kind}_${counters[kind]}]]`;
      inserts.push({ placeholder, original: match, piiKind: kind });
      return placeholder;
    });
  }

  // Explicit name list (caller already knows their patient's display name)
  for (const name of options?.extraNames ?? []) {
    if (!name || name.length < 2) continue;
    const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    redacted = redacted.replace(new RegExp(safeName, 'g'), () => {
      counters['NAME'] = (counters['NAME'] ?? 0) + 1;
      const placeholder = `[[NAME_${counters['NAME']}]]`;
      inserts.push({ placeholder, original: name, piiKind: 'NAME' });
      return placeholder;
    });
  }

  // Persist encrypted originals so the un-redactor can restore them later.
  if (inserts.length > 0) {
    await db.execute(sql`
      INSERT INTO ai_anonymization_tokens
        (organization_id, job_token, placeholder, original_encrypted, pii_kind, expires_at)
      VALUES
        ${sql.join(
          inserts.map(
            (row) => sql`(
              ${organizationId},
              ${jobToken},
              ${row.placeholder},
              encode(pgp_sym_encrypt(${row.original}, ${piiKey()}), 'base64'),
              ${row.piiKind},
              ${expiresAt}
            )`,
          ),
          sql.raw(','),
        )}
    `);
  }

  const tokenMap: Record<string, { piiKind: string }> = {};
  for (const row of inserts) tokenMap[row.placeholder] = { piiKind: row.piiKind };

  return { jobToken, redacted, tokenMap };
}

/** Restore placeholders in the AI output to their original PII values. */
export async function deanonymize(jobToken: string, modelOutput: string): Promise<string> {
  const rows = await db
    .select()
    .from(aiAnonymizationTokens)
    .where(eq(aiAnonymizationTokens.jobToken, jobToken));
  if (rows.length === 0) return modelOutput;

  // Decrypt all in one shot
  const result = await db.execute<{ placeholder: string; original: string }>(sql`
    SELECT placeholder,
           pgp_sym_decrypt(decode(original_encrypted, 'base64'), ${piiKey()}) AS original
    FROM ai_anonymization_tokens
    WHERE job_token = ${jobToken}
  `);
  // postgres-js returns rows directly on result
  const decoded = (result as unknown as Array<{ placeholder: string; original: string }>) ?? [];

  let out = modelOutput;
  for (const r of decoded) {
    out = out.split(r.placeholder).join(r.original);
  }

  // Mark consumed so the next cron can prune
  await db
    .update(aiAnonymizationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(aiAnonymizationTokens.jobToken, jobToken));

  return out;
}

function piiKey(): string {
  const k = process.env.PII_ENCRYPTION_KEY;
  if (!k) throw new Error('PII_ENCRYPTION_KEY env not set');
  return k;
}
