-- ─────────────────────────────────────────────────────────────────────
-- Backfill conversation.contact_locale from the latest inbound
-- message's body_locale.
--
-- Why: web inquiry submissions before the fix (commit after task #98)
-- always wrote contactLocale='ko' for KR-UI submissions, even when the
-- patient typed Chinese / Japanese in the memo. That silently broke
-- outbound auto-translate for those conversations — the agent's
-- Korean reply went out untranslated because the system thought the
-- patient was also Korean.
--
-- Strategy: for every conversation whose contact_locale disagrees
-- with its most recent inbound message's body_locale (and body_locale
-- is a confident detection — not NULL, not 'other'), ratchet
-- contact_locale up to the detected value. This is the same heuristic
-- inbox-router applies on every new inbound message; we're just
-- catching the conversations that bypassed it via direct INSERT.
--
-- Safe to re-run: idempotent. Only updates rows where the locale
-- actually changes.
-- ─────────────────────────────────────────────────────────────────────

with latest as (
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.body_locale
  from messages m
  where m.direction = 'inbound'
    and m.body_locale is not null
    and m.body_locale <> 'other'
  order by m.conversation_id, m.sent_at desc
)
update conversations c
   set contact_locale = latest.body_locale,
       updated_at = now()
  from latest
 where c.id = latest.conversation_id
   and c.contact_locale is distinct from latest.body_locale
returning c.id, c.contact_display_name, c.contact_country_code, c.contact_locale;
