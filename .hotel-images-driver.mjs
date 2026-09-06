// 운영의 /api/jobs/hotel-images 를 대상이 없어질 때까지 반복 호출 (호출당 최대 8곳, 60초 이내).
//   node --env-file=.env.local .hotel-images-driver.mjs
const SECRET = process.env.IMAGE_JOB_SECRET;
const BASE = process.env.SITE_BASE ?? 'https://www.glowuptour.com';
let total = { done: 0, none: 0 };
for (let i = 0; i < 60; i += 1) {
  const res = await fetch(`${BASE}/api/jobs/hotel-images`, { method: 'POST', headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 6 }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { console.log('HTTP', res.status, JSON.stringify(j).slice(0, 200)); break; }
  for (const l of j.log ?? []) console.log(l);
  total.done += j.done ?? 0; total.none += j.none ?? 0;
  console.log(`-- batch ${i + 1}: targets ${j.targets} done ${j.done} none ${j.none} (누적 ${total.done}/${total.none})`);
  if (!j.targets) break;
}
console.log('finished', total);
