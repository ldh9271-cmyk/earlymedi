// 병원/파트너 데이터가 바뀌면 lib/i18n/ko-labels.generated.ts 를 다시 만든다.
//
// clinics/[slug] 페이지는 details 의 모든 필드를 localizeKoLabel() 로 통과시키고,
// 그 사전이 이 생성 파일이다. DB 에 새 라벨이 들어왔는데 사전을 다시 만들지
// 않으면 외국어 페이지에 한국어가 그대로 노출된다 — 렌더러는 맵에 없는 문자열을
// 원문 그대로 두기 때문. 사람이 기억해서 돌리는 대신 Stop 훅이 이 스크립트를 부른다.
//
// 3단계로 빠져나간다. 대부분의 턴은 1단계에서 끝난다(질의 1회, 수십 ms).
//   1. updated_at 워터마크가 그대로면 → 즉시 종료
//   2. 데이터는 바뀌었지만 새 한국어 라벨이 없으면 → 워터마크만 갱신
//   3. 새 라벨이 있으면 → generate-ko-label-map.mjs 실행 (기존 항목은 재번역 안 함)
//
// usage: node --env-file=.env.local scripts/sync-ko-labels.mjs

import postgres from 'postgres';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MAP = 'lib/i18n/ko-labels.generated.ts';
const MARK = '.ko-labels-watermark';
const GEN = 'scripts/generate-ko-label-map.mjs';

// 훅에서 돌기 때문에 어떤 실패도 턴을 막지 않는다. 조용히 0 으로 끝낸다.
const bail = (msg) => { if (msg) console.error(`[ko-labels] ${msg}`); process.exit(0); };
const notify = (text) => { console.log(JSON.stringify({ systemMessage: text })); };

if (!process.env.DATABASE_URL) bail('DATABASE_URL 없음 — 건너뜀');

const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 10 });

let watermark;
try {
  // ── 1단계: 워터마크 대조 ────────────────────────────────────────
  const [{ mark }] = await sql`
    select coalesce(
      greatest(
        (select max(updated_at) from hospitals),
        (select max(updated_at) from partner_listings)
      )::text, '') as mark`;
  watermark = mark;
  const prev = existsSync(MARK) ? readFileSync(MARK, 'utf8').trim() : '';
  if (prev && prev === watermark) bail();

  // ── 2단계: 사전에 없는 한국어 라벨이 있는지 ─────────────────────
  if (!existsSync(MAP)) bail(`${MAP} 없음 — 생성기를 직접 실행할 것`);
  const src = readFileSync(MAP, 'utf8');
  const m = src.match(/KO_LABELS = (\{[\s\S]*\}) as const/);
  if (!m) bail(`${MAP} 파싱 실패`);
  const known = JSON.parse(m[1]);

  const hasKorean = (s) => typeof s === 'string' && /[가-힣]/.test(s);
  const need = new Set();
  const push = (v) => { const t = typeof v === 'string' ? v.trim() : ''; if (hasKorean(t)) need.add(t); };

  // 렌더러가 실제로 localizeKoLabel 을 거는 필드만 모은다
  // (clinics/[slug]/page.tsx 의 ClinicDetails 참고).
  for (const r of await sql`select details from hospitals where details is not null and details <> '{}'::jsonb`) {
    const d = r.details ?? {};
    push(d.tagline); push(d.hours); push(d.station); push(d.notice);
    (d.signatureProcedures ?? []).forEach(push);
    (d.departments ?? []).forEach((x) => { push(x?.title); (x?.items ?? []).forEach(push); });
    (d.doctors ?? []).forEach((x) => { push(x?.name); push(x?.role); });
    (d.facilities ?? []).forEach(push);
    (d.trust ?? []).forEach(push);
    (d.foreignSupport?.languages ?? []).forEach(push);
    push(d.foreignSupport?.note);
  }
  for (const r of await sql`
    select promo_label as l from category_listings where promo_label <> ''
    union select promo_label from partner_listings where promo_label <> ''
    union select price_unit from partner_listings where price_unit <> ''`) push(r.l);
  // 병원 카드의 도시명도 이 맵을 탄다
  for (const r of await sql`select distinct address_json->>'city' as l from hospitals`) push(r.l);

  const missing = [...need].filter((k) => !known[k]);
  await sql.end();

  if (missing.length === 0) {
    writeFileSync(MARK, watermark, 'utf8');
    bail();
  }

  // ── 3단계: 생성기 실행 ──────────────────────────────────────────
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    notify(`ko-labels 사전에 없는 한국어 라벨 ${missing.length}개 — GOOGLE_GENERATIVE_AI_API_KEY 가 없어 재생성을 건너뜁니다. \`node --env-file=.env.local ${GEN}\` 를 직접 실행하세요.`);
    process.exit(0);
  }
  const res = spawnSync(process.execPath, ['--env-file=.env.local', GEN], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: process.env,
  });
  const wrote = /wrote .*: (\d+) entries/.exec(res.stdout ?? '');
  if (res.status === 0 && wrote) {
    writeFileSync(MARK, watermark, 'utf8');
    notify(`병원·파트너 데이터가 바뀌어 ko-labels 사전을 다시 만들었습니다 — 새 라벨 ${missing.length}개, 총 ${wrote[1]}개. ${MAP} 가 수정됐으니 커밋해 주세요.`);
  } else {
    notify(`ko-labels 재생성 실패 (새 라벨 ${missing.length}개). \`node --env-file=.env.local ${GEN}\` 로 다시 시도해 주세요.`);
  }
} catch (e) {
  try { await sql.end(); } catch {}
  bail(e?.message?.slice(0, 200) ?? String(e));
}
