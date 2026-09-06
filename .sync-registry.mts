/* 전국 병원 레지스트리 적재 재개 — 실패 페이지는 3회 재시도. 사용: START=47 node ... */
import { syncBasisPage } from '@/lib/hospital-registry/hira';

const start = Date.now();
let page = Number(process.env.START ?? '1') || 1;
let upserted = 0;
for (;;) {
  let r: Awaited<ReturnType<typeof syncBasisPage>> | null = null;
  for (let attempt = 1; attempt <= 3 && !r; attempt += 1) {
    try {
      r = await syncBasisPage({ pageNo: page });
    } catch (e) {
      console.log(`page ${page} attempt ${attempt} failed: ${e instanceof Error ? e.message : e}`);
      await new Promise((res) => setTimeout(res, 3000 * attempt));
    }
  }
  if (!r) { console.log('GIVE UP at page', page); process.exit(1); }
  upserted += r.upserted;
  if (page % 5 === 0 || r.done) {
    console.log(`page ${page} · fetched ${r.fetched} · total ${r.totalCount} · upserted ${upserted} · ${Math.round((Date.now() - start) / 1000)}s`);
  }
  if (r.done) break;
  page += 1;
}
console.log('DONE last page', page, 'upserted', upserted);
process.exit(0);
