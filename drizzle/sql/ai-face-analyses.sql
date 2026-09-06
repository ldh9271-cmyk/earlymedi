-- AI 얼굴 분석 결과 (2026-09-07). 사진은 저장하지 않고 분석 코멘트·추천만 보관해 회원가입 뒤 이메일 발송으로 잇는다.
create table if not exists ai_face_analyses (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'kr',
  user_id uuid,
  email text,
  analysis jsonb not null default '{}'::jsonb,
  recs jsonb not null default '[]'::jsonb,
  contact jsonb,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_face_analyses_user_idx on ai_face_analyses (user_id);
alter table ai_face_analyses enable row level security;
