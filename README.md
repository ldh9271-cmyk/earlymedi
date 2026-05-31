# KoreaGlowUp AI Concierge

> 환자의 첫 문의부터 귀국 후 케어까지, 한 손에서 끝나는 의료관광

한국 보건복지부 등록 외국인환자 유치업자(메디컬 투어 회사 · 해외 헬스케어 컨시어지)를 위한 AI 기반 의료관광 통합 SaaS.

## 의료관광 구조

| account_type | URL prefix | 역할 |
|---|---|---|
| `agency` | `/agency/*` | 유치업체 — 모객 · 매칭 · 결제 · 정산 · 비자 · 사후관리 |
| `freelancer` | `/freelancer/*` | 프리랜서 — 송객 · 통역 · 코디 · 인플루언서 |
| `medical` | `/medical/*` | 의료기관 — 견적 · 진료 · 시술 차트 |
| `non_medical` | `/partner/*` | 파트너업체 — 호텔 · 스파 · 살롱 · 식당 · 교통 · 관광 |

URL prefix와 `account_type`이 불일치하면 미들웨어가 즉시 차단합니다 (5단 권한).

## 핵심 엔진

- `lib/pricing/hospital-fee-engine.ts` — 병원 송객 수수료 (성형 30% · 피부 20% · 모발 25% · 치과 15% · 안과 15% 등)
- `lib/pricing/deposit-engine.ts` — 병원별 예약금 정책 · 환불 티어
- `lib/pricing/commission-engine.ts` — 프리랜서 커미션 (정책 우선순위: 케이스 > 개인 > 카테고리 > 조직)
- `lib/clinical/treatment-chart-engine.ts` — 시술 차트 (병원 → 에이전시 검증 → 환자 공유, 버전 관리, finalize 후 수정 불가)
- `lib/ai/extraction/engine.ts` — 공통 AI 추출 엔진 (사진 · PDF · 텍스트 · 음성 · 메신저 → zod 강제 스키마)
- `lib/billing/` — 요금제 · 과금 · 사용량 미터 · 제한 단계

## 기술 스택

Next.js 14 (App Router) · TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Realtime + Storage) · Drizzle ORM · Vercel AI SDK + Gemini 2.5 Pro (메인) + Claude Opus 4.7 (폴백) · Stripe Connect + Toss + Alipay + WeChat + PayPal + Wise · Mapbox · Recharts · Vitest + Playwright · Vercel

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 편집해서 Supabase·AI·결제 키 입력

# 3. DB 마이그레이션 + 시드
npm run db:push
npm run db:seed

# 4. 개발 서버 실행
npm run dev
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | TypeScript 타입 체크 (any 금지 강제) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Drizzle 마이그레이션 SQL 생성 |
| `npm run db:push` | DB에 스키마 푸시 (개발 전용) |
| `npm run db:migrate` | 마이그레이션 실행 |
| `npm run db:studio` | Drizzle Studio GUI |
| `npm run db:seed` | 시드 데이터 삽입 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |

## 브랜드

- 메인 컬러: Indigo 600 (#4F46E5) — 신뢰
- 서브 컬러: Amber 500 (#F59E0B) — 호스피탈리티
- 강조 컬러: Emerald 500 (#10B981) — 회복 · 케어

## 라이선스

Proprietary © KoreaGlowUp
