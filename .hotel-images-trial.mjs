const S = process.env.IMAGE_JOB_SECRET;
for (const only of ['그랜드하얏트', '노보텔 앰배서더 서울용산', '이비스스타일 앰배서더 서울용산', '웨스틴 서울', 'JW메리어트']) {
  const res = await fetch('https://www.glowuptour.com/api/jobs/hotel-images', { method: 'POST', headers: { Authorization: `Bearer ${S}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1, only }) });
  const j = await res.json().catch(() => ({}));
  console.log(`== ${only} ==`, res.status, JSON.stringify(j));
}
