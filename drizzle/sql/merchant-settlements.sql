-- 3자 검증 정산 (2026-09-07): 소비자 QR 제시 → 가맹점 스캔·최종 결제금액 입력 → 소비자 확인(또는 72시간 자동) → 플랫폼 수수료 확정
create table if not exists merchant_settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  org_id text,
  org_name text,
  invoice_no text not null,
  online_paid_won integer not null default 0,
  final_amount_won integer not null,
  fee_bp integer not null default 0,
  fee_won integer not null default 0,
  status text not null default 'declared',
  declared_at timestamptz not null default now(),
  consumer_confirmed_at timestamptz,
  disputed_at timestamptz,
  dispute_note text,
  confirmed_at timestamptz,
  confirmed_by text,
  invoiced_at timestamptz,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merchant_settlements_org_idx on merchant_settlements (org_id, status);
create index if not exists merchant_settlements_status_idx on merchant_settlements (status, declared_at);
alter table merchant_settlements enable row level security;
