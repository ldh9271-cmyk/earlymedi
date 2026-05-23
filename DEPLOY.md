# Vercel 배포 가이드

투자자·고객용 영구 데모 URL 발급 절차. **5–10분 소요**.

## 사전 점검 (✅ 완료)

- [x] git 저장소 초기화 + 첫 커밋
- [x] `.gitignore` — `.env.local`, `.vercel`, `.next` 모두 차단
- [x] `vercel.json` — 서울 리전(icn1) + `X-Robots-Tag: noindex` 헤더
- [x] `public/robots.txt` — 검색엔진 인덱싱 차단
- [x] `npm run build` 통과 — 35+ 라우트 정상

## 경로 A. CLI 즉시 배포 (가장 빠름)

GitHub 없이 폴더에서 바로 배포합니다.

```powershell
# 1) Vercel CLI 설치 (한 번만)
npm i -g vercel

# 2) earlymedi-concierge 폴더에서 실행
cd C:\Users\ldh70\EarlyMedi\earlymedi-concierge
vercel
```

처음 실행 시 묻는 항목:
1. **Set up and deploy** → `Y`
2. **Which scope** → 본인 계정 선택 (Vercel 계정 없으면 `vercel login` → 이메일 인증)
3. **Link to existing project** → `N`
4. **Project name** → `earlymedi-concierge` (또는 원하는 이름)
5. **In which directory is your code located** → `./` (현재 폴더)
6. **Want to modify these settings** → `N`

배포 시작 → `https://earlymedi-concierge-xxxx.vercel.app` 형태 URL 생성.

## 환경 변수 설정 (필수)

배포는 일단 성공하지만 마케팅 페이지 외에는 동작 안 합니다. 다음 변수를 Vercel Dashboard에서 입력:

### 최소 (랜딩 + 가입 위저드 + 쇼룸 동작용)

```
NEXT_PUBLIC_APP_URL              = https://earlymedi-concierge-xxxx.vercel.app
NEXT_PUBLIC_APP_NAME             = EarlyMedi AI Concierge
NEXT_PUBLIC_SUPABASE_URL         = https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = dummy-anon-key-for-preview-only
SUPABASE_SERVICE_ROLE_KEY        = dummy-service-role-for-preview-only
DATABASE_URL                     = postgresql://placeholder:placeholder@localhost:5432/placeholder
PII_ENCRYPTION_KEY               = 0000000000000000000000000000000000000000000000000000000000000000
INVITE_TOKEN_SECRET              = vercel-demo-only-not-real-secret
```

CLI에서 한 번에:
```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 프롬프트가 떠서 값 입력 → Production / Preview / Development 모두 선택
```

또는 Dashboard에서: `vercel.com/dashboard → 프로젝트 → Settings → Environment Variables`.

설정 후 재배포:
```powershell
vercel --prod
```

### 풀 데모 (대시보드·인박스·시술 차트까지)

실제 Supabase 프로젝트 + 시드 필요:

```
NEXT_PUBLIC_SUPABASE_URL         = (https://YOUR_PROJECT.supabase.co — Supabase Dashboard에서)
NEXT_PUBLIC_SUPABASE_ANON_KEY    = (anon public key)
SUPABASE_SERVICE_ROLE_KEY        = (service_role secret — 절대 클라이언트 노출 X)
DATABASE_URL                     = (Connection string → Pooler → Transaction mode)
PII_ENCRYPTION_KEY               = (32바이트 hex — `openssl rand -hex 32`)
INVITE_TOKEN_SECRET              = (강력한 무작위 문자열)
```

배포 후 한 번만:
```powershell
# 로컬에서 .env.local에 같은 값 채우고:
npm run db:push          # Drizzle 스키마 적용
npm run setup:master     # astoriakr@naver.com 마스터 운영자 등록
npm run db:seed          # 데모 데이터 + 4 org 시드
```

그 후 `https://your-url.vercel.app/login`에서 `astoriakr@naver.com` 입력 → 매직링크 → 4개 데모 조직 모두 owner로 접속.

## 경로 B. GitHub 연결 (자동 재배포 권장)

```powershell
# 1) GitHub에 빈 repo 생성 (gh CLI 또는 github.com에서)
gh repo create earlymedi-concierge --private --source=. --remote=origin --push

# 또는 수동:
# github.com → New repo → "earlymedi-concierge" → Private 권장
# git remote add origin https://github.com/<USERNAME>/earlymedi-concierge.git
# git push -u origin main
```

그 다음 Vercel Dashboard에서:
1. `vercel.com/new` → Import Git Repository → 방금 만든 repo 선택
2. Framework: Next.js (자동 감지)
3. Environment Variables 입력 (위 목록과 동일)
4. Deploy

이후 `git push`할 때마다 자동으로 새 deployment + Preview URL 생성됩니다.

## 데모 URL 공유 시 주의

- ✅ `vercel.json`의 `X-Robots-Tag: noindex` + `robots.txt`로 Google 인덱싱 차단됨
- ✅ 더미 env 상태에서는 마케팅 페이지·쇼룸·요금제만 보임 → 실제 환자 PII 노출 없음
- ⚠️ Supabase 연결 후에는 **데모 데이터만** 시드하고 실제 환자 정보는 절대 넣지 말 것
- ⚠️ Pro 플랜 이상 시 [Password Protection](https://vercel.com/docs/security/deployment-protection) 활성화 권장

## 도메인 연결 (선택)

자체 도메인 (예: `app.earlymedi.com`) 연결:
1. Vercel Dashboard → 프로젝트 → Settings → Domains → 도메인 입력
2. 도메인 등록업체에서 CNAME 레코드 추가:
   ```
   app.earlymedi.com  CNAME  cname.vercel-dns.com
   ```
3. SSL 인증서 자동 발급 (Let's Encrypt)

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 빌드 실패 — `Module not found` | `node_modules` 캐시 문제 | `vercel --force` 또는 Dashboard에서 "Redeploy" |
| 모든 페이지 500 | 환경 변수 누락 | 위 목록 다시 확인 후 Re-deploy |
| 로그인 후 무한 리다이렉트 | `NEXT_PUBLIC_APP_URL`이 실제 도메인과 다름 | 변경 후 Re-deploy |
| 매직링크 안 옴 | Supabase Auth → Email Templates 미설정 또는 도메인 미등록 | Supabase Dashboard → Authentication → URL Configuration |

## 명령 요약

```powershell
# 최초 배포 (한 번만)
npm i -g vercel
cd C:\Users\ldh70\EarlyMedi\earlymedi-concierge
vercel                              # interactive setup

# 환경 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL

# 재배포
vercel --prod

# 로그 확인
vercel logs
```
