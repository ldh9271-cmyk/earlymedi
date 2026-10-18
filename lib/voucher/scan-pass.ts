import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkIn, loadOrderByToken, orgCanCheckIn, orgName, type CheckInResult } from './service';
import { declareFinalAmount, resolveMerchantFeeBp, type DeclareResult } from './settlement';
import type { VoucherMeta } from './token';

/**
 * 1회용 비회원 스캔 링크 (2026-10-18) — 유치업체(상품·병원을 등록한 조직)나 마스터가 실제 방문지
 * (병원·매장)에 보내는 링크. 방문지 담당자는 비즈니스 계정 없이 /scan/p/<pass> 에서 고객 QR 을
 * 한 번 스캔해 방문 확인 + 최종 결제금액 기록을 하고, 끝나면 무료 가입 안내를 본다.
 *
 *   pass = p1.<발급 조직 id | m(마스터)>.<만료 epoch초 36진>.<nonce 12자>.<HMAC 22자>
 *
 * DB 에 저장하지 않는다 — 서명으로 위조를 막고, '1회' 는 방문 확인한 주문의 meta.voucher.passNonce 로
 * 판단한다(같은 nonce 가 다른 주문에 이미 찍혀 있으면 사용 끝). 같은 주문은 다시 스캔해 금액 정정 가능.
 * 권한은 발급 조직과 같다 — 조직 발급 링크는 그 조직이 체크인할 수 있는 주문(+병원 진료 예약)만,
 * 마스터 발급 링크는 모든 주문.
 */
export const PASS_TTL_DAYS = 7;

function secret(): string {
  const s = process.env.VOUCHER_SECRET || process.env.INVITE_TOKEN_SECRET || '';
  if (!s) throw new Error('VOUCHER_SECRET/INVITE_TOKEN_SECRET 가 설정되지 않았습니다');
  return s;
}
const sig = (body: string): string => createHmac('sha256', secret()).update(`scan-pass:${body}`).digest('base64url').slice(0, 22);

export type ScanPass = { org: string | null; exp: number; nonce: string };
export type PassReason = 'pass_invalid' | 'pass_expired' | 'pass_used';

export function signScanPass(org: string | null, days = PASS_TTL_DAYS): { pass: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + days * 86_400;
  const body = `p1.${org ?? 'm'}.${exp.toString(36)}.${randomBytes(9).toString('base64url')}`;
  return { pass: `${body}.${sig(body)}`, expiresAt: new Date(exp * 1000) };
}

export function verifyScanPass(raw: string): { ok: true; pass: ScanPass } | { ok: false; reason: PassReason } {
  const m = /^p1\.([0-9a-f-]{36}|m)\.([0-9a-z]{1,10})\.([A-Za-z0-9_-]{12})\.([A-Za-z0-9_-]{22})$/.exec(raw.trim());
  if (!m) return { ok: false, reason: 'pass_invalid' };
  const [, org, expRaw, nonce, given] = m as unknown as [string, string, string, string, string];
  const a = Buffer.from(given);
  const b = Buffer.from(sig(`p1.${org}.${expRaw}.${nonce}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'pass_invalid' };
  const exp = parseInt(expRaw, 36);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return { ok: false, reason: 'pass_expired' };
  return { ok: true, pass: { org: org === 'm' ? null : org, exp, nonce } };
}

export function scanPassUrl(pass: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.glowuptour.com').replace(/\/$/, '');
  return `${base}/scan/p/${pass}`;
}

/** 이 링크(nonce)로 방문 확인한 주문 — 없으면 null */
export async function passUsedOrder(nonce: string): Promise<{ id: string; invoiceNo: string } | null> {
  const rows = (await db.execute(sql`
    select id, invoice_no from checkout_orders where meta->'voucher'->>'passNonce' = ${nonce} limit 1`)) as unknown as Array<{ id: string; invoice_no: string }>;
  const r = rows[0];
  return r ? { id: String(r.id), invoiceNo: String(r.invoice_no) } : null;
}

export async function passIssuerName(p: ScanPass): Promise<string> {
  return p.org ? orgName(p.org) : '글로우업투어';
}

type Order = NonNullable<Awaited<ReturnType<typeof loadOrderByToken>>>;
/** 기록에 남는 방문지 이름 — 계정이 없으니 주문의 병원·상품 이름으로 */
const venueName = (o: Order): string => `${o.hospitalName || o.listingTitle} (1회용 링크)`.slice(0, 160);
const passOwns = (o: Order, nonce: string): boolean => (o.meta as { voucher?: VoucherMeta } | null)?.voucher?.passNonce === nonce;

export type PassCheckInResult = (CheckInResult & { feeBp?: number; canSettle?: boolean }) | { ok: false; reason: PassReason };

/** 링크로 방문 확인. 이미 다른 사람이 확인한 주문이면 결과만 보여주고 금액 입력은 막는다(canSettle=false). */
export async function checkInWithPass(token: string, raw: string): Promise<PassCheckInResult> {
  const v = verifyScanPass(raw);
  if (!v.ok) return v;
  const o = await loadOrderByToken(token);
  if (!o) return { ok: false, reason: 'invalid' };
  const used = await passUsedOrder(v.pass.nonce);
  if (used && used.id !== o.id) return { ok: false, reason: 'pass_used' };
  if (v.pass.org && o.kind !== 'hospital_visit' && !(await orgCanCheckIn(o, v.pass.org))) return { ok: false, reason: 'forbidden' };
  const r = await checkIn(token, { id: v.pass.org ?? 'master', name: venueName(o) }, { authorized: true, passNonce: v.pass.nonce });
  if (!r.ok) return r;
  const fresh = (await loadOrderByToken(token)) ?? o;
  const feeBp = r.summary.settlement?.feeBp ?? (await resolveMerchantFeeBp(v.pass.org));
  return { ...r, feeBp, canSettle: passOwns(fresh, v.pass.nonce) };
}

/** 링크로 최종 결제금액 기록 — 이 링크로 방문 확인한 주문만. 아직 확인 전이면 먼저 확인한다. */
export async function settleWithPass(token: string, raw: string, input: { finalAmountWon: number; note?: string | null }): Promise<DeclareResult | { ok: false; reason: PassReason | 'invalid' }> {
  const v = verifyScanPass(raw);
  if (!v.ok) return v;
  let o = await loadOrderByToken(token);
  if (!o) return { ok: false, reason: 'invalid' };
  if (!(o.meta as { voucher?: VoucherMeta } | null)?.voucher?.checkedInAt) {
    const c = await checkInWithPass(token, raw);
    if (!c.ok) return c.reason === 'pass_invalid' || c.reason === 'pass_expired' || c.reason === 'pass_used' ? c : { ok: false, reason: 'forbidden' };
    o = (await loadOrderByToken(token)) ?? o;
  }
  if (!passOwns(o, v.pass.nonce)) return { ok: false, reason: 'forbidden' };
  return declareFinalAmount(o, { id: v.pass.org ?? 'master', name: venueName(o) }, input, { authorized: true });
}
