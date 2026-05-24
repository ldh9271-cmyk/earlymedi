CREATE TYPE "public"."account_type" AS ENUM('agency', 'freelancer', 'medical', 'non_medical');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'view', 'approve', 'reject', 'finalize', 'export', 'login', 'logout', 'invite', 'accept_invite', 'change_role', 'change_status', 'payment', 'refund', 'payout', 'ai_call');--> statement-breakpoint
CREATE TYPE "public"."billing_account_status" AS ENUM('trial', 'active', 'past_due', 'restricted', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual', 'usage_based', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."billing_plan_code" AS ENUM('agency_starter', 'agency_growth', 'agency_pro', 'medical_payg', 'medical_committed', 'partner_listing', 'partner_active', 'freelancer_free');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'manager', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'active', 'suspended', 'left');--> statement-breakpoint
CREATE TYPE "public"."org_verification_status" AS ENUM('unverified', 'documents_submitted', 'in_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."partner_subtype" AS ENUM('hotel', 'spa', 'salon', 'studio', 'restaurant', 'transport', 'tour', 'shopping', 'wellness', 'other');--> statement-breakpoint
CREATE TYPE "public"."pii_visibility" AS ENUM('none', 'minimal', 'masked', 'full');--> statement-breakpoint
CREATE TYPE "public"."ai_tone" AS ENUM('concise', 'friendly', 'luxury');--> statement-breakpoint
CREATE TYPE "public"."channel_kind" AS ENUM('kakao', 'instagram', 'line', 'whatsapp', 'wechat', 'telegram', 'messenger', 'sms', 'email', 'web');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('connected', 'disconnected', 'error', 'rate_limited');--> statement-breakpoint
CREATE TYPE "public"."conversation_assignee_role" AS ENUM('primary', 'cc', 'observer');--> statement-breakpoint
CREATE TYPE "public"."conversation_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."conversation_stage" AS ENUM('lead', 'qualified', 'case', 'quoted', 'booked', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_content_type" AS ENUM('text', 'image', 'video', 'audio', 'file', 'sticker', 'location', 'voice_note', 'system_notice', 'template');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sender_role" AS ENUM('patient', 'agent', 'ai_concierge', 'system', 'partner', 'hospital');--> statement-breakpoint
CREATE TYPE "public"."ai_call_kind" AS ENUM('chat', 'translate', 'summarize', 'classify', 'extract', 'vision_ocr', 'speech_to_text', 'embedding', 'safety_classifier');--> statement-breakpoint
CREATE TYPE "public"."ai_extraction_schema" AS ENUM('passport', 'id_card', 'flight_ticket', 'external_quote', 'medical_record', 'menu', 'treatment_chart', 'message_intent', 'generic');--> statement-breakpoint
CREATE TYPE "public"."ai_extraction_status" AS ENUM('queued', 'preprocessing', 'ocr', 'vision', 'structuring', 'validating', 'review_required', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('gemini', 'claude', 'openai', 'gcv', 'tesseract');--> statement-breakpoint
CREATE TYPE "public"."deposit_collector" AS ENUM('agency_collects', 'hospital_direct', 'escrow');--> statement-breakpoint
CREATE TYPE "public"."deposit_timing" AS ENUM('on_quote_accepted', 'days_before_visit', 'on_arrival');--> statement-breakpoint
CREATE TYPE "public"."fee_base" AS ENUM('gross_amount', 'net_excl_vat', 'patient_paid');--> statement-breakpoint
CREATE TYPE "public"."fee_package_rule" AS ENUM('sum_per_item', 'single_package_rate', 'minimum_per_item');--> statement-breakpoint
CREATE TYPE "public"."patient_sex" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'inactive', 'archived', 'merged_into');--> statement-breakpoint
CREATE TYPE "public"."procedure_category" AS ENUM('plastic_surgery', 'dermatology', 'hair', 'dental', 'ophthalmology', 'obstetrics', 'oriental', 'checkup', 'orthopedic', 'cardiology', 'oncology', 'gastroenterology', 'neurology', 'urology', 'ent', 'fertility', 'cosmetic_dental', 'general');--> statement-breakpoint
CREATE TYPE "public"."treatment_chart_item_kind" AS ENUM('procedure', 'addon', 'consumable', 'medication', 'follow_up_visit', 'discount', 'tax', 'other');--> statement-breakpoint
CREATE TYPE "public"."treatment_chart_share_level" AS ENUM('name_only', 'name_and_amount', 'full');--> statement-breakpoint
CREATE TYPE "public"."treatment_chart_status" AS ENUM('draft', 'submitted', 'agency_review', 'changes_requested', 'agency_approved', 'patient_shared', 'finalized', 'voided');--> statement-breakpoint
CREATE TYPE "public"."vat_treatment" AS ENUM('exempt', 'taxable', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."case_actor_role" AS ENUM('agency', 'hospital', 'patient', 'freelancer', 'partner', 'ai', 'system');--> statement-breakpoint
CREATE TYPE "public"."case_assignee_role" AS ENUM('primary_manager', 'coordinator', 'interpreter', 'driver', 'observer');--> statement-breakpoint
CREATE TYPE "public"."case_event_type" AS ENUM('created', 'stage_changed', 'assignee_changed', 'note_added', 'message_linked', 'file_attached', 'rfq_sent', 'quote_received', 'quote_accepted', 'quote_rejected', 'deposit_invoiced', 'deposit_paid', 'appointment_scheduled', 'patient_arrived', 'treatment_started', 'treatment_completed', 'chart_submitted', 'chart_finalized', 'payment_received', 'payout_initiated', 'aftercare_event', 'partner_booking_requested', 'partner_booking_confirmed', 'closed_won', 'closed_lost', 'closed_cancelled');--> statement-breakpoint
CREATE TYPE "public"."case_stage" AS ENUM('scoping', 'rfq_sent', 'quoted', 'accepted', 'deposit_paid', 'scheduled', 'arrived', 'in_treatment', 'post_treatment', 'aftercare', 'closed_won', 'closed_lost', 'closed_cancelled');--> statement-breakpoint
CREATE TYPE "public"."visa_category" AS ENUM('C_3_3', 'G_1_10', 'C_3_9', 'E_6', 'other');--> statement-breakpoint
CREATE TYPE "public"."visa_request_status" AS ENUM('drafting', 'invitation_issued', 'submitted', 'approved', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."recovery_alert_reason" AS ENUM('no_response', 'pain_score_high', 'photo_anomaly', 'patient_reported_issue', 'medication_missed', 'restriction_violation');--> statement-breakpoint
CREATE TYPE "public"."recovery_alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."recovery_photo_status" AS ENUM('uploaded', 'ai_reviewed', 'flagged_for_doctor', 'doctor_reviewed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."recovery_routine_status" AS ENUM('scheduled', 'active', 'completed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recovery_routine_task_kind" AS ENUM('message_check_in', 'photo_check_in', 'video_visit', 'pain_score', 'medication_reminder', 'restriction_reminder', 'follow_up_offer', 'satisfaction_survey');--> statement-breakpoint
CREATE TYPE "public"."recovery_routine_task_status" AS ENUM('pending', 'sent', 'patient_responded', 'overdue', 'escalated', 'skipped', 'completed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_type" "account_type" NOT NULL,
	"partner_subtype" "partner_subtype",
	"name" text NOT NULL,
	"legal_name" text,
	"slug" text NOT NULL,
	"country_code" text DEFAULT 'KR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"default_locale" text DEFAULT 'ko' NOT NULL,
	"default_currency" text DEFAULT 'KRW' NOT NULL,
	"business_registration_number" text,
	"foreign_patient_license_number" text,
	"medical_license_number" text,
	"representative_name" text,
	"verification_documents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_status" "org_verification_status" DEFAULT 'unverified' NOT NULL,
	"verification_notes" text,
	"branding_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"locale" text DEFAULT 'ko' NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"phone" text,
	"flags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active_org_id" uuid,
	"is_system_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"extra_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invited_by_id" uuid,
	"invited_email" text,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "freelancer_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_org_id" uuid NOT NULL,
	"freelancer_org_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"pii_visibility" "pii_visibility" DEFAULT 'none' NOT NULL,
	"commission_policy_json" jsonb DEFAULT null,
	"contract_pdf_url" text,
	"contract_signed_at" timestamp with time zone,
	"monthly_case_cap" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"terminated_at" timestamp with time zone,
	"terminated_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_org_id" uuid NOT NULL,
	"partner_org_id" uuid NOT NULL,
	"referral_rate_policy_json" jsonb DEFAULT null,
	"deposit_policy_json" jsonb DEFAULT null,
	"commission_policy_json" jsonb DEFAULT null,
	"contract_pdf_url" text,
	"agency_signed_at" timestamp with time zone,
	"partner_signed_at" timestamp with time zone,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"terminated_at" timestamp with time zone,
	"terminated_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"intended_account_type" text,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "billing_account_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_starts_at" timestamp with time zone,
	"current_period_ends_at" timestamp with time zone,
	"past_due_since" timestamp with time zone,
	"restricted_since" timestamp with time zone,
	"suspended_since" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"prepaid_balance_krw" integer DEFAULT 0 NOT NULL,
	"auto_topup_enabled" boolean DEFAULT false NOT NULL,
	"auto_topup_threshold_krw" integer,
	"auto_topup_amount_krw" integer,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_connect_account_id" text,
	"toss_customer_id" text,
	"billing_email" text,
	"billing_name" text,
	"tax_invoice_email" text,
	"settlement_fee_bearer" text DEFAULT 'agency' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "billing_plan_code" NOT NULL,
	"account_type" "account_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"registration_fee_krw" integer DEFAULT 0 NOT NULL,
	"monthly_fee_krw" integer DEFAULT 0 NOT NULL,
	"annual_fee_krw" integer DEFAULT 0 NOT NULL,
	"prepaid_charge_min_krw" integer DEFAULT 0 NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"settlement_fee_bp" integer DEFAULT 0 NOT NULL,
	"seat_limit" integer,
	"cycle" "billing_cycle" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"impersonated_by_user_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "channel_kind" NOT NULL,
	"display_name" text NOT NULL,
	"external_account_id" text NOT NULL,
	"status" "channel_status" DEFAULT 'connected' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"credentials_encrypted" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "conversation_assignee_role" DEFAULT 'primary' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"external_thread_id" text NOT NULL,
	"contact_display_name" text,
	"contact_external_id" text,
	"contact_country_code" text,
	"contact_locale" text,
	"contact_avatar_url" text,
	"patient_id" uuid,
	"lead_id" uuid,
	"case_id" uuid,
	"stage" "conversation_stage" DEFAULT 'lead' NOT NULL,
	"priority" "conversation_priority" DEFAULT 'normal' NOT NULL,
	"subject" text,
	"summary" text,
	"ai_intent_class" text,
	"ai_sentiment_score" integer,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "glossary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_locale" text NOT NULL,
	"source_text" text NOT NULL,
	"target_locale" text NOT NULL,
	"target_text" text NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"sender_role" "sender_role" NOT NULL,
	"sender_user_id" uuid,
	"external_message_id" text,
	"in_reply_to_message_id" uuid,
	"content_type" "message_content_type" DEFAULT 'text' NOT NULL,
	"body" text NOT NULL,
	"body_locale" text,
	"translation_ko" text,
	"translation_en" text,
	"attachments_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_tone" "ai_tone",
	"ai_sentiment_score" integer,
	"ai_intent_class" text,
	"ai_risk_flags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_extracted_entities_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	"failure_reason" text,
	"is_seen_by_agency" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp with time zone,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shortcut" text NOT NULL,
	"title" text NOT NULL,
	"body_by_locale" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"category_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_anonymization_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_token" text NOT NULL,
	"placeholder" text NOT NULL,
	"original_encrypted" text NOT NULL,
	"pii_kind" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_extraction_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"original_value" text,
	"corrected_value" text NOT NULL,
	"corrected_by_user_id" uuid,
	"applied_to_aliases" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"schema_key" "ai_extraction_schema" NOT NULL,
	"status" "ai_extraction_status" DEFAULT 'queued' NOT NULL,
	"input_kind" text NOT NULL,
	"input_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ocr_text_hash" text,
	"ocr_text" text,
	"vision_raw" jsonb DEFAULT null,
	"extracted_json" jsonb DEFAULT null,
	"confidence_json" jsonb DEFAULT null,
	"overall_confidence_bp" integer,
	"warnings_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_model" text,
	"fallback_used" boolean DEFAULT false NOT NULL,
	"failure_reason" text,
	"bound_entity_type" text,
	"bound_entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"kind" "ai_call_kind" NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"vision_images" integer DEFAULT 0 NOT NULL,
	"audio_seconds" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"fell_back_from" text,
	"failed" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"estimated_cost_krw" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_medical_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"category" text NOT NULL,
	"severity" text,
	"description" text NOT NULL,
	"onset_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"extra_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_tags_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"label" text NOT NULL,
	"color" text DEFAULT '#94a3b8' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"alias_name" text,
	"full_name" text NOT NULL,
	"surname" text,
	"given_names" text,
	"nationality" text,
	"country_code" text,
	"locale" text,
	"timezone" text,
	"sex" "patient_sex" DEFAULT 'unknown' NOT NULL,
	"date_of_birth" text,
	"passport_number_encrypted" text,
	"rrn_encrypted" text,
	"phone_encrypted" text,
	"email_encrypted" text,
	"insurance_card_encrypted" text,
	"phone_hash" text,
	"email_hash" text,
	"passport_hash" text,
	"preferred_currency" text DEFAULT 'KRW',
	"preferred_channel_kind" text,
	"avatar_url" text,
	"patient_portal_token" text,
	"patient_portal_last_seen_at" timestamp with time zone,
	"status" "patient_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"source_channel" text,
	"source_campaign" text,
	"source_conversation_id" uuid,
	"tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"last_viewed_by_id" uuid,
	"consent_medical_at" timestamp with time zone,
	"consent_overseas_transfer_at" timestamp with time zone,
	"consent_marketing_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_deposit_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"fixed_amount_krw" integer,
	"percentage_bp" integer,
	"per_procedure_overrides_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collector" "deposit_collector" DEFAULT 'agency_collects' NOT NULL,
	"timing" "deposit_timing" DEFAULT 'on_quote_accepted' NOT NULL,
	"days_before_visit" integer DEFAULT 7 NOT NULL,
	"refund_tiers_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"medical_cause_full_refund" boolean DEFAULT true NOT NULL,
	"force_majeure_full_refund" boolean DEFAULT true NOT NULL,
	"include_in_referral_base" boolean DEFAULT true NOT NULL,
	"cancellation_split_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"auto_reminders_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_cancel_on_unpaid_hours" integer,
	"contract_pdf_url" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"title" text,
	"specialty" text,
	"languages_spoken" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo_url" text,
	"bio" text,
	"license_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_referral_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"category" "procedure_category",
	"procedure_code" text,
	"rate_bp" integer NOT NULL,
	"fee_base" "fee_base" DEFAULT 'net_excl_vat' NOT NULL,
	"package_rule" "fee_package_rule" DEFAULT 'sum_per_item' NOT NULL,
	"vat_treatment" "vat_treatment" DEFAULT 'exempt' NOT NULL,
	"vip_rate_bp" integer,
	"repeat_rate_bp" integer,
	"minimum_guarantee_krw" integer,
	"progressive_rules_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"include_patient_direct_payment" boolean DEFAULT false NOT NULL,
	"payout_trigger" text DEFAULT 'on_treatment_done' NOT NULL,
	"payout_hold_days" integer DEFAULT 0 NOT NULL,
	"contract_pdf_url" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_term_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"procedure_catalog_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"learned_from_feedback" boolean DEFAULT false NOT NULL,
	"confidence_bp" integer DEFAULT 8000 NOT NULL,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"linked_org_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text,
	"license_number" text,
	"foreign_patient_license_number" text,
	"country_code" text DEFAULT 'KR' NOT NULL,
	"address_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"latitude" text,
	"longitude" text,
	"primary_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages_spoken" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"website_url" text,
	"cover_image_url" text,
	"rating" integer,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"onboarding_checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active_for_matching" boolean DEFAULT false NOT NULL,
	"settlement_cycle" text DEFAULT 'monthly' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procedures_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"category" "procedure_category" NOT NULL,
	"name_i18n_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aliases_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vat_treatment" "vat_treatment" DEFAULT 'taxable' NOT NULL,
	"recovery_days" integer DEFAULT 7 NOT NULL,
	"flight_restriction_days" integer DEFAULT 7 NOT NULL,
	"constraints_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"typical_price_krw_min" integer,
	"typical_price_krw_max" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_chart_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"role" text NOT NULL,
	"signer_user_id" uuid,
	"signer_name" text,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signature_ip" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_chart_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"purpose" text,
	"ai_extraction_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_chart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"item_kind" "treatment_chart_item_kind" DEFAULT 'procedure' NOT NULL,
	"raw_text" text,
	"procedure_name_normalized" text NOT NULL,
	"procedure_catalog_id" uuid,
	"procedure_code" text,
	"body_part" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_krw" integer DEFAULT 0 NOT NULL,
	"line_total_krw" integer DEFAULT 0 NOT NULL,
	"vat_included" boolean DEFAULT false NOT NULL,
	"vat_rate_bp" integer DEFAULT 1000 NOT NULL,
	"vat_treatment" "vat_treatment" DEFAULT 'taxable' NOT NULL,
	"is_addon" boolean DEFAULT false NOT NULL,
	"discount_krw" integer DEFAULT 0 NOT NULL,
	"confidence_bp" integer DEFAULT 10000 NOT NULL,
	"ai_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_chart_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_role" text NOT NULL,
	"actor_user_id" uuid,
	"summary" text,
	"diff_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_charts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"hospital_org_id" uuid,
	"patient_id" uuid NOT NULL,
	"case_id" uuid,
	"version_number" integer DEFAULT 1 NOT NULL,
	"supersedes_id" uuid,
	"status" "treatment_chart_status" DEFAULT 'draft' NOT NULL,
	"share_level" "treatment_chart_share_level" DEFAULT 'name_and_amount' NOT NULL,
	"treatment_date" text NOT NULL,
	"doctor_name" text,
	"notes" text,
	"subtotal_krw" integer DEFAULT 0 NOT NULL,
	"discount_total_krw" integer DEFAULT 0 NOT NULL,
	"vat_total_krw" integer DEFAULT 0 NOT NULL,
	"grand_total_krw" integer DEFAULT 0 NOT NULL,
	"deposit_received_krw" integer DEFAULT 0 NOT NULL,
	"patient_balance_krw" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'KRW' NOT NULL,
	"fx_snapshot_json" jsonb DEFAULT null,
	"vat_treatment" "vat_treatment" DEFAULT 'mixed' NOT NULL,
	"referral_policy_snapshot_json" jsonb DEFAULT null,
	"referral_fee_total_krw" integer,
	"quote_id" uuid,
	"quote_total_krw" integer,
	"quote_variance_bp" integer,
	"quote_variance_flag" text,
	"ai_extraction_job_id" uuid,
	"submitted_at" timestamp with time zone,
	"agency_approved_at" timestamp with time zone,
	"agency_approved_by_id" uuid,
	"patient_shared_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "case_assignee_role" DEFAULT 'primary_manager' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by_id" uuid,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_counters" (
	"organization_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"event_type" "case_event_type" NOT NULL,
	"actor_role" "case_actor_role" DEFAULT 'agency' NOT NULL,
	"actor_user_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"source_conversation_id" uuid,
	"case_number" text NOT NULL,
	"title" text NOT NULL,
	"stage" "case_stage" DEFAULT 'scoping' NOT NULL,
	"priority" "conversation_priority" DEFAULT 'normal' NOT NULL,
	"target_hospital_ids_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_procedure_categories_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_procedure_codes_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_arrival_date" text,
	"actual_arrival_date" text,
	"estimated_departure_date" text,
	"actual_departure_date" text,
	"patient_timezone" text,
	"currency" text DEFAULT 'KRW' NOT NULL,
	"estimated_total_krw" integer,
	"actual_total_krw" integer,
	"deposit_total_krw" integer,
	"referral_fee_total_krw" integer,
	"policy_snapshot_json" jsonb DEFAULT null,
	"policy_snapshot_at" timestamp with time zone,
	"source_channel" text,
	"source_campaign" text,
	"tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_reason" text,
	"closed_by_user_id" uuid,
	"events_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visa_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"visa_request_id" uuid NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"content_json" jsonb NOT NULL,
	"storage_path" text,
	"sha256" text,
	"sent_to_embassy_at" timestamp with time zone,
	"issued_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visa_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"case_id" uuid,
	"inviter_hospital_id" uuid,
	"category" "visa_category" NOT NULL,
	"status" "visa_request_status" DEFAULT 'drafting' NOT NULL,
	"consulate_country_code" text,
	"consulate_city" text,
	"intended_entry_date" text,
	"intended_exit_date" text,
	"duration_days" integer,
	"submitted_at" timestamp with time zone,
	"decision_at" timestamp with time zone,
	"decision_reason" text,
	"invitation_letter_storage_path" text,
	"invitation_letter_sha256" text,
	"attachments_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"routine_id" uuid,
	"task_id" uuid,
	"photo_id" uuid,
	"patient_id" uuid NOT NULL,
	"severity" "recovery_alert_severity" NOT NULL,
	"reason" "recovery_alert_reason" NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"assigned_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"routine_id" uuid,
	"task_id" uuid,
	"patient_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"captured_at" timestamp with time zone,
	"body_part" text,
	"status" "recovery_photo_status" DEFAULT 'uploaded' NOT NULL,
	"ai_analysis_json" jsonb DEFAULT null,
	"doctor_reviewed_by_id" uuid,
	"doctor_review_note" text,
	"doctor_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_routine_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"offset_days" integer NOT NULL,
	"kind" "recovery_routine_task_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"requires_response" boolean DEFAULT true NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"overdue_at" timestamp with time zone,
	"status" "recovery_routine_task_status" DEFAULT 'pending' NOT NULL,
	"delivery_channel_kind" text,
	"delivery_external_id" text,
	"response_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"case_id" uuid,
	"chart_id" uuid,
	"template_id" uuid,
	"status" "recovery_routine_status" DEFAULT 'scheduled' NOT NULL,
	"started_on" text NOT NULL,
	"patient_timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"patient_locale" text DEFAULT 'ko' NOT NULL,
	"snapshot_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_routine_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"procedure_category" text,
	"tasks_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"follow_up_days" integer DEFAULT 365 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "freelancer_affiliations" ADD CONSTRAINT "freelancer_affiliations_agency_org_id_organizations_id_fk" FOREIGN KEY ("agency_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "freelancer_affiliations" ADD CONSTRAINT "freelancer_affiliations_freelancer_org_id_organizations_id_fk" FOREIGN KEY ("freelancer_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_agency_org_id_organizations_id_fk" FOREIGN KEY ("agency_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_partner_org_id_organizations_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invites" ADD CONSTRAINT "invites_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonated_by_user_id_users_id_fk" FOREIGN KEY ("impersonated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_assignees" ADD CONSTRAINT "conversation_assignees_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_assignees" ADD CONSTRAINT "conversation_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_assignees" ADD CONSTRAINT "conversation_assignees_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_anonymization_tokens" ADD CONSTRAINT "ai_anonymization_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_extraction_feedback" ADD CONSTRAINT "ai_extraction_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_extraction_feedback" ADD CONSTRAINT "ai_extraction_feedback_job_id_ai_extraction_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_extraction_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_extraction_feedback" ADD CONSTRAINT "ai_extraction_feedback_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_extraction_jobs" ADD CONSTRAINT "ai_extraction_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_extraction_jobs" ADD CONSTRAINT "ai_extraction_jobs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_tags_catalog" ADD CONSTRAINT "patient_tags_catalog_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_last_viewed_by_id_users_id_fk" FOREIGN KEY ("last_viewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_deposit_policies" ADD CONSTRAINT "hospital_deposit_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_deposit_policies" ADD CONSTRAINT "hospital_deposit_policies_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_doctors" ADD CONSTRAINT "hospital_doctors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_doctors" ADD CONSTRAINT "hospital_doctors_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_referral_rates" ADD CONSTRAINT "hospital_referral_rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_referral_rates" ADD CONSTRAINT "hospital_referral_rates_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_term_aliases" ADD CONSTRAINT "hospital_term_aliases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_term_aliases" ADD CONSTRAINT "hospital_term_aliases_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_term_aliases" ADD CONSTRAINT "hospital_term_aliases_procedure_catalog_id_procedures_catalog_id_fk" FOREIGN KEY ("procedure_catalog_id") REFERENCES "public"."procedures_catalog"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_linked_org_id_organizations_id_fk" FOREIGN KEY ("linked_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedures_catalog" ADD CONSTRAINT "procedures_catalog_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_approvals" ADD CONSTRAINT "treatment_chart_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_approvals" ADD CONSTRAINT "treatment_chart_approvals_chart_id_treatment_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."treatment_charts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_approvals" ADD CONSTRAINT "treatment_chart_approvals_signer_user_id_users_id_fk" FOREIGN KEY ("signer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_attachments" ADD CONSTRAINT "treatment_chart_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_attachments" ADD CONSTRAINT "treatment_chart_attachments_chart_id_treatment_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."treatment_charts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_attachments" ADD CONSTRAINT "treatment_chart_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_items" ADD CONSTRAINT "treatment_chart_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_items" ADD CONSTRAINT "treatment_chart_items_chart_id_treatment_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."treatment_charts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_revisions" ADD CONSTRAINT "treatment_chart_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_revisions" ADD CONSTRAINT "treatment_chart_revisions_chart_id_treatment_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."treatment_charts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_chart_revisions" ADD CONSTRAINT "treatment_chart_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_hospital_org_id_organizations_id_fk" FOREIGN KEY ("hospital_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_agency_approved_by_id_users_id_fk" FOREIGN KEY ("agency_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_charts" ADD CONSTRAINT "treatment_charts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_assignees" ADD CONSTRAINT "case_assignees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_assignees" ADD CONSTRAINT "case_assignees_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_assignees" ADD CONSTRAINT "case_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_assignees" ADD CONSTRAINT "case_assignees_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_counters" ADD CONSTRAINT "case_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_events" ADD CONSTRAINT "case_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_invitations" ADD CONSTRAINT "visa_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_invitations" ADD CONSTRAINT "visa_invitations_visa_request_id_visa_requests_id_fk" FOREIGN KEY ("visa_request_id") REFERENCES "public"."visa_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_invitations" ADD CONSTRAINT "visa_invitations_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_inviter_hospital_id_hospitals_id_fk" FOREIGN KEY ("inviter_hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_routine_id_recovery_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."recovery_routines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_task_id_recovery_routine_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."recovery_routine_tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_photo_id_recovery_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."recovery_photos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_alerts" ADD CONSTRAINT "recovery_alerts_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_photos" ADD CONSTRAINT "recovery_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_photos" ADD CONSTRAINT "recovery_photos_routine_id_recovery_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."recovery_routines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_photos" ADD CONSTRAINT "recovery_photos_task_id_recovery_routine_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."recovery_routine_tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_photos" ADD CONSTRAINT "recovery_photos_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_photos" ADD CONSTRAINT "recovery_photos_doctor_reviewed_by_id_users_id_fk" FOREIGN KEY ("doctor_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routine_tasks" ADD CONSTRAINT "recovery_routine_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routine_tasks" ADD CONSTRAINT "recovery_routine_tasks_routine_id_recovery_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."recovery_routines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routines" ADD CONSTRAINT "recovery_routines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routines" ADD CONSTRAINT "recovery_routines_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routines" ADD CONSTRAINT "recovery_routines_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routines" ADD CONSTRAINT "recovery_routines_chart_id_treatment_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."treatment_charts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routines" ADD CONSTRAINT "recovery_routines_template_id_recovery_routine_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recovery_routine_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_routine_templates" ADD CONSTRAINT "recovery_routine_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_account_type_idx" ON "organizations" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_verification_status_idx" ON "organizations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_country_idx" ON "organizations" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_org_idx" ON "users" USING btree ("active_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_user_unique" ON "org_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_org_status_idx" ON "org_memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_user_active_idx" ON "org_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "freelancer_affiliations_pair_unique" ON "freelancer_affiliations" USING btree ("agency_org_id","freelancer_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "freelancer_affiliations_referral_code_unique" ON "freelancer_affiliations" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "freelancer_affiliations_agency_active_idx" ON "freelancer_affiliations" USING btree ("agency_org_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "freelancer_affiliations_freelancer_active_idx" ON "freelancer_affiliations" USING btree ("freelancer_org_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_contracts_pair_unique" ON "partner_contracts" USING btree ("agency_org_id","partner_org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_contracts_agency_active_idx" ON "partner_contracts" USING btree ("agency_org_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_contracts_partner_active_idx" ON "partner_contracts" USING btree ("partner_org_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invites_token_hash_unique" ON "invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invites_org_email_idx" ON "invites" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invites_email_idx" ON "invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invites_expires_at_idx" ON "invites" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_accounts_org_unique" ON "billing_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_accounts_status_idx" ON "billing_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_accounts_trial_ends_idx" ON "billing_accounts" USING btree ("trial_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plans_code_unique" ON "billing_plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_plans_account_type_idx" ON "billing_plans" USING btree ("account_type","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_org_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_org_idx" ON "channels" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channels_org_kind_extid_unique" ON "channels" USING btree ("organization_id","kind","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_assignees_conv_user_unique" ON "conversation_assignees" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_assignees_conv_idx" ON "conversation_assignees" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_assignees_user_idx" ON "conversation_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_org_stage_idx" ON "conversations" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_org_last_inbound_idx" ON "conversations" USING btree ("organization_id","last_inbound_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_channel_thread_unique" ON "conversations" USING btree ("channel_id","external_thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_patient_idx" ON "conversations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_case_idx" ON "conversations" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "glossary_terms_org_pair_unique" ON "glossary_terms" USING btree ("organization_id","source_locale","source_text","target_locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conv_sent_idx" ON "messages" USING btree ("conversation_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_org_sent_idx" ON "messages" USING btree ("organization_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_external_unique" ON "messages" USING btree ("conversation_id","external_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quick_replies_org_shortcut_unique" ON "quick_replies" USING btree ("organization_id","shortcut");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quick_replies_org_idx" ON "quick_replies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_anon_org_job_idx" ON "ai_anonymization_tokens" USING btree ("organization_id","job_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_anon_expires_idx" ON "ai_anonymization_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_feedback_org_job_idx" ON "ai_extraction_feedback" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_extraction_org_schema_idx" ON "ai_extraction_jobs" USING btree ("organization_id","schema_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_extraction_org_status_idx" ON "ai_extraction_jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_extraction_bound_idx" ON "ai_extraction_jobs" USING btree ("bound_entity_type","bound_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_org_kind_idx" ON "ai_usage_logs" USING btree ("organization_id","kind","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_org_created_idx" ON "ai_usage_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_history_patient_idx" ON "patient_medical_history" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_history_category_idx" ON "patient_medical_history" USING btree ("patient_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_tags_org_label_unique" ON "patient_tags_catalog" USING btree ("organization_id","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_org_status_idx" ON "patients" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_org_name_idx" ON "patients" USING btree ("organization_id","full_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_phone_hash_idx" ON "patients" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_email_hash_idx" ON "patients" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_passport_hash_idx" ON "patients" USING btree ("passport_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patients_source_conversation_unique" ON "patients" USING btree ("organization_id","source_conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_deposit_policies_hospital_unique" ON "hospital_deposit_policies" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_doctors_hospital_idx" ON "hospital_doctors" USING btree ("hospital_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_referral_rates_h_cat_idx" ON "hospital_referral_rates" USING btree ("hospital_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_referral_rates_h_proc_unique" ON "hospital_referral_rates" USING btree ("hospital_id","procedure_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_term_aliases_unique" ON "hospital_term_aliases" USING btree ("hospital_id","alias");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_term_aliases_hospital_idx" ON "hospital_term_aliases" USING btree ("hospital_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospitals_org_slug_unique" ON "hospitals" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospitals_org_active_idx" ON "hospitals" USING btree ("organization_id","is_active_for_matching");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospitals_linked_idx" ON "hospitals" USING btree ("linked_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "procedures_org_code_unique" ON "procedures_catalog" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "procedures_org_category_idx" ON "procedures_catalog" USING btree ("organization_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "treatment_chart_approvals_chart_role_unique" ON "treatment_chart_approvals" USING btree ("chart_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_chart_attachments_chart_idx" ON "treatment_chart_attachments" USING btree ("chart_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_chart_items_chart_line_idx" ON "treatment_chart_items" USING btree ("chart_id","line_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_chart_items_proc_catalog_idx" ON "treatment_chart_items" USING btree ("procedure_catalog_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_chart_revisions_chart_idx" ON "treatment_chart_revisions" USING btree ("chart_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_charts_org_status_idx" ON "treatment_charts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_charts_hospital_idx" ON "treatment_charts" USING btree ("hospital_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_charts_patient_idx" ON "treatment_charts" USING btree ("patient_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_charts_finalized_idx" ON "treatment_charts" USING btree ("organization_id","finalized_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "case_assignees_case_user_role_unique" ON "case_assignees" USING btree ("case_id","user_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_assignees_case_idx" ON "case_assignees" USING btree ("case_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_assignees_user_active_idx" ON "case_assignees" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "case_counters_org_year_pk" ON "case_counters" USING btree ("organization_id","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_events_case_occurred_idx" ON "case_events" USING btree ("case_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_events_org_occurred_idx" ON "case_events" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_events_related_idx" ON "case_events" USING btree ("related_entity_type","related_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_org_stage_idx" ON "cases" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_org_patient_idx" ON "cases" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_org_arrival_idx" ON "cases" USING btree ("organization_id","estimated_arrival_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_org_last_activity_idx" ON "cases" USING btree ("organization_id","last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cases_org_number_unique" ON "cases" USING btree ("organization_id","case_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "visa_invitations_request_version_unique" ON "visa_invitations" USING btree ("visa_request_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visa_requests_org_patient_idx" ON "visa_requests" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visa_requests_status_idx" ON "visa_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_alerts_active_idx" ON "recovery_alerts" USING btree ("organization_id","resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_alerts_severity_idx" ON "recovery_alerts" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_alerts_patient_idx" ON "recovery_alerts" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_photos_routine_idx" ON "recovery_photos" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_photos_status_idx" ON "recovery_photos" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_photos_patient_idx" ON "recovery_photos" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_routine_tasks_routine_idx" ON "recovery_routine_tasks" USING btree ("routine_id","offset_days");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_routine_tasks_due_idx" ON "recovery_routine_tasks" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_routines_org_patient_idx" ON "recovery_routines" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_routines_status_idx" ON "recovery_routines" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recovery_routine_templates_org_code_unique" ON "recovery_routine_templates" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recovery_routine_templates_category_idx" ON "recovery_routine_templates" USING btree ("procedure_category");