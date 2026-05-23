import '@testing-library/jest-dom/vitest';

// Dummy env so server-side modules (DB client, encryption) can be imported in unit tests.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.PII_ENCRYPTION_KEY ??=
  '0000000000000000000000000000000000000000000000000000000000000000';
process.env.INVITE_TOKEN_SECRET ??= 'test-invite-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
