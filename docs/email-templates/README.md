# KoreaGlowUp · Supabase Email Templates

환자(B2C)와 사업자(B2B) 양쪽에서 사용하는 Supabase Auth 이메일 템플릿 모음.

## 📁 파일 구성

| 파일 | 용도 | Supabase 매핑 |
|---|---|---|
| `confirm-signup-patient.html` | 환자 회원가입 본인 확인 | **Confirm signup** |
| `magic-link-patient.html` | 환자 로그인 매직링크 | **Magic Link** |
| `reset-password.html` | 비밀번호 재설정 (공용) | **Reset Password** |
| `invite-business.html` | 사업자 팀원 초대 (공용) | **Invite user** |

> 카피는 모두 **한국어 + 영어 + 중국어 + 일본어** 4언어 병기. Supabase 가 발송 시점에 환자 언어를 알 수 없으므로 한 메일 안에 4언어 블록을 모두 포함합니다.

---

## 🚀 적용 방법

1. **Supabase Dashboard** → 프로젝트 선택
2. 좌측 메뉴 **Authentication** → **Email Templates**
3. 변경할 템플릿 (예: "Confirm signup") 클릭
4. **Subject heading** 에 아래 표의 subject 입력
5. **Message body (HTML)** 에 해당 `.html` 파일 내용 전체 복사·붙여넣기
6. 우측 상단 **Save** 클릭

### Subject 라인

| 템플릿 | Subject (Supabase 입력란에 그대로) |
|---|---|
| Confirm signup | `[KoreaGlowUp] 이메일 인증 · Verify your email · 邮箱验证 · メール認証` |
| Magic Link | `[KoreaGlowUp] 로그인 링크 · Sign-in link · 登录链接 · ログインリンク` |
| Reset Password | `[KoreaGlowUp] 비밀번호 재설정 · Reset password · 重置密码 · パスワード再設定` |
| Invite user | `[KoreaGlowUp] 팀 초대 · Team invitation` |

---

## 🛠 Supabase 템플릿 변수

Supabase 가 발송 직전에 다음 변수를 실제 값으로 치환합니다:

| 변수 | 의미 |
|---|---|
| `{{ .ConfirmationURL }}` | 인증/매직링크 URL (가장 중요) |
| `{{ .Email }}` | 수신자 이메일 |
| `{{ .Token }}` | 6자리 OTP 코드 (OTP 모드 사용 시) |
| `{{ .TokenHash }}` | 해시된 토큰 |
| `{{ .SiteURL }}` | 프로젝트 설정의 Site URL |
| `{{ .RedirectTo }}` | redirect_to 파라미터 |

→ 우리 템플릿은 `{{ .ConfirmationURL }}` 만 사용. 다른 변수는 호환을 위해 사용 안 함.

---

## 📨 Site URL · Redirect URLs 설정

이메일 링크가 정확한 도메인으로 가도록 다음도 확인해주세요:

**Supabase Dashboard → Authentication → URL Configuration**

- **Site URL**: `https://earlymedi.vercel.app`
- **Redirect URLs** (allowlist) 에 다음 모두 추가:
  - `https://earlymedi.vercel.app/api/auth/callback`
  - `https://earlymedi.vercel.app/api/auth/callback?**`
  - `https://earlymedi.vercel.app/**` (전체 와일드카드 — 환자 PWA 미래 확장 대비)
  - `http://localhost:3000/api/auth/callback` (로컬 개발용)

---

## 🌐 환자 언어 자동 감지 (향후 개선)

지금은 한 메일 안에 4언어를 모두 포함하지만, 환자가 가입할 때 `signup_locale` 을 `auth.users.raw_user_meta_data` 에 저장해두므로 (`/[locale]/signup/_components/patient-signup-form.tsx`), 나중에 Edge Function 으로 templating 을 갈아끼우면 해당 언어 1개만 보낼 수 있습니다.

그 전까지는 4언어 병기가 가장 안전한 fallback.
