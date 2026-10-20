#!/usr/bin/env node
/**
 * Sign in with Apple — Supabase 'Apple' 공급자용 client secret(JWT) 생성기.
 *
 * 애플은 서비스 비밀값 대신 .p8 키로 서명한 JWT 를 요구하고, 유효기간은 최대 6개월이다.
 * 만료 전에 다시 만들어 Supabase(Authentication > Providers > Apple > Secret Key)에 넣어야 한다.
 *
 *   node scripts/apple-client-secret.mjs \
 *     --key ../glowuptour-app/secrets/AuthKey_XXXXXXXXXX.p8 \
 *     --key-id XXXXXXXXXX --team-id YYYYYYYYYY --client-id com.glowuptour.web [--days 180]
 *
 * 출력은 JWT 한 줄뿐이다(어디에도 기록하지 않는다). client-id 는 Services ID(웹용) 식별자.
 */
import { readFileSync } from 'node:fs';
import { createPrivateKey, createSign } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [])).filter((p) => p.length));
const need = (k) => { if (!args[k]) { console.error(`--${k} 가 필요합니다`); process.exit(1); } return args[k]; };
const keyPath = need('key'); const kid = need('key-id'); const iss = need('team-id'); const sub = need('client-id');
const days = Math.min(Number(args.days ?? 180), 180);

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = { alg: 'ES256', kid, typ: 'JWT' };
const payload = { iss, iat: now, exp: now + days * 86400, aud: 'https://appleid.apple.com', sub };
const signingInput = `${b64(header)}.${b64(payload)}`;

const key = createPrivateKey(readFileSync(keyPath, 'utf8'));
// ES256 은 DER 이 아니라 r||s(64바이트) 서명이어야 한다 — Node 의 dsaEncoding 옵션으로 바로 얻는다
const sig = createSign('SHA256').update(signingInput).sign({ key, dsaEncoding: 'ieee-p1363' });
process.stdout.write(`${signingInput}.${sig.toString('base64url')}\n`);
console.error(`만료: ${new Date(payload.exp * 1000).toISOString().slice(0, 10)} (이 날짜 전에 다시 생성해 Supabase 에 넣을 것)`);
