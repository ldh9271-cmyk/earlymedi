/* 운영 DB에 SQL 파일을 그대로 적용한다 (drizzle-kit push 미사용 프로젝트).
   사용: node --env-file=.env.local scripts/apply-sql.mjs drizzle/sql/hospital-registry.sql */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const file = process.argv[2];
if (!file) {
  console.error('usage: node --env-file=.env.local scripts/apply-sql.mjs <path.sql>');
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const text = readFileSync(file, 'utf8');
try {
  await sql.unsafe(text);
  console.log('applied:', file);
} finally {
  await sql.end();
}
