# AI 상담 지식 베이스 (lib/ai/knowledge)

`/api/ai/chat`(실시간 AI 상담)이 병원·상품 DB 근거 외에 **일반 지식**(의료 용어·급여/비급여·시술/수술, K뷰티 비의료 서비스)을 답변에 쓰도록 하는 모듈입니다.
질문마다 관련 청크를 골라 시스템 프롬프트의 `KNOWLEDGE` 블록에 넣습니다(임베딩 없이 용어 일치, `retrieve.ts`).

## 지식은 어디서 오나 (2026-10-21 부터 DB 우선)

1. **DB 문서(운영)** — 마스터 콘솔 `/master/ai-knowledge` 에서 Word(.docx)·마크다운을 올리면 서버가 변환(`docx.ts`)·청킹(`chunker.ts`)해
   `ai_knowledge_docs` / `ai_knowledge_chunks` 에 저장합니다. 상담은 활성 문서의 청크를 **60초 캐시**(`store.ts`, `unstable_cache` 태그 `ai-knowledge`)로 읽고,
   업로드·활성/비활성·삭제 때 `revalidateTag` 로 즉시 비우므로 **재배포 없이 다음 상담 요청부터 반영**됩니다. 비활성화하면 빠집니다.
2. **내장 폴백** — 활성 문서가 하나도 없거나 DB 를 못 읽으면 빌드에 포함된 `chunks.generated.ts`(`docs/*.md`)를 씁니다.

| 파일 | 역할 |
|---|---|
| `chunker.ts` | 마크다운 → 청크(표 행·절) + 외국어 별칭 사전. `CHAPTER_RULES`(장 제목 → 카테고리). 순수 함수, 스크립트·업로드 API 공용 |
| `docx.ts` | Word(.docx) → 마크다운(표는 마크다운 표, 제목 스타일/번호 → #/##). 외부 의존성 없음 |
| `db.ts` | `ai_knowledge_docs`/`chunks` CRUD, `fetchActiveKnowledge(db)`(활성 청크 + 별칭 합치기). drizzle 인스턴스를 인자로 받아 스크립트에서도 씀 |
| `store.ts` | 서버 전용: 60초 캐시 `loadActiveKnowledge()`, `invalidateKnowledgeCache()` |
| `retrieve.ts` | `rankKnowledge(question, {cats}, source)` 순수 검색, `retrieveKnowledge(question, {cats})`(async, DB→폴백) → 프롬프트용 텍스트. `KB_RULES` = 항상 넣는 상담 원칙 |
| `docs/*.md` | 내장 폴백 원본. ① `medical-terms-guide.ko.md` 의료용어·급여/비급여·시술/수술 ② `kbeauty-terms-guide.ko.md` K뷰티 비의료 서비스 (둘 다 2026-10-21, DB 첫 시드와 동일) |
| `chunks.generated.ts` | `docs/*.md` 빌드 산출물(`npx tsx scripts/kb-build.ts`). **자동 생성, 커밋 대상** |
| `cat-labels.ts` | 카테고리 키 → 마스터 화면 한국어 라벨 |

관련 화면·API: `app/master/ai-knowledge/`(목록·업로드·활성/비활성·삭제·검색 테스트 박스·원문/청크 보기), `app/api/master/ai-knowledge/upload/route.ts`.
DB: `drizzle/schema/ai-knowledge.ts`, `drizzle/sql/ai-knowledge.sql`(RLS 켜고 anon/authenticated 권한 회수 — 서버 직결만).

## 문서 추가·수정 (운영)

마스터 콘솔 `/master/ai-knowledge` → 파일 선택 → 업로드. 결과 줄에 청크 수·카테고리 분포가 나오고, '검색 테스트' 박스에 질문을 넣어 어떤 청크가 잡히는지 확인합니다.
'원문·청크' 에서 장 → 과·업종 매핑을 볼 수 있습니다. 장 제목이 `CHAPTER_RULES` 의 단어와 맞지 않으면 `other` 로 잡혀 과 가중치가 안 붙습니다 — 그때는 `chunker.ts` 에 규칙을 한 줄 더하고 배포합니다.

문서 규칙: 장 제목 `# N. 제목`, 절 `## N.M 제목`, 용어 표는 첫 칸이 용어(제목 괄호 안 라틴 표기는 별칭). '목차'·'부록'·'화자/내용' 대화 표·'사용 안내' 장의 문단과 '문서 구성' 표는 제외, '대조표' 표는 별칭 사전으로만.

## 내장 폴백 갱신 (개발자)

1. Word → 마크다운: `npx tsx scripts/kb-import-docx.ts <파일.docx> <이름>` → `docs/<이름>.md`
2. 재생성: `npx tsx scripts/kb-build.ts` → `chunks.generated.ts`
3. 테스트: `npx vitest run tests/unit/ai/knowledge.test.ts` (청커 동치·기준 질문 3개·DB 소스 동치)
4. 커밋·푸시. (운영 DB 에도 넣으려면 마스터 콘솔에서 올리거나, 새 DB 라면 `npx tsx scripts/kb-seed-db.ts` 로 `docs/*.md` 를 한 번 시드)

## 장 제목 → 카테고리 매핑

`chunker.ts` `CHAPTER_RULES` 가 장 제목의 단어로 `cat` 을 정하고, 질문의 과·업종(route.ts `HOSPITAL_CATS`·`LISTING_CATS`)과 같으면 ×1.5 가중치.
의료: 피부과·성형외과·치과·안과·정형외과·척추/통증·내과/검진·산부인과·비뇨·이비인후과·한의·모발이식 / 비의료: 퍼스널컬러·헤어 살롱·반영구·메이크업·네일·속눈썹/왁싱·두피·에스테틱/스파·포토 스튜디오·K-pop·패키지.
특수: toc(목차)·appendix(부록)·glossary(대조표→별칭)·rules(상담 원칙)·intro(사용 안내: 표만)·common(공통 기초).

## 답변 규칙(프롬프트에 고정, `KB_RULES`)

- 지식은 일반 설명용 — 특정 병원·업체의 시술·가격·결과로 말하지 않음(병원·상품 사실은 DATA 만).
- 단기 방문 외국인은 급여/비급여와 무관하게 병원 견적 전액 자부담, 가격은 병원별·단위(샷/cc/유닛) 확인.
- 기간·횟수는 "일반적으로/개인차" 로, 보장·최상급 표현 금지, 진단·처방 금지, 응급 증상은 119.
- 비의료 뷰티는 의료가 아님(치료·완치 표현 금지, 의료 목적은 병원으로), 살롱 가격은 1회 기준가·추가 요금 안내.
