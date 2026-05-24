import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Messaging-related enums (Phase 2).
 * Kept in a dedicated file so phase boundaries stay obvious.
 */

export const channelKindEnum = pgEnum('channel_kind', [
  'kakao',
  'instagram',
  'line',
  'whatsapp',
  'wechat',
  'telegram',
  'messenger', // Facebook Messenger
  'naver', // Naver Talk Talk
  'sms',
  'email',
  'web',
]);

export const channelStatusEnum = pgEnum('channel_status', [
  'connected',
  'disconnected',
  'error',
  'rate_limited',
]);

export const conversationStageEnum = pgEnum('conversation_stage', [
  'lead', // first contact
  'qualified', // intent detected (medical-tour)
  'case', // bound to a `cases` row (Phase 5)
  'quoted', // RFQ-quote returned
  'booked', // deposit paid / appointment confirmed
  'archived',
]);

export const conversationPriorityEnum = pgEnum('conversation_priority', [
  'low',
  'normal',
  'high',
  'urgent', // legal/refund/lawsuit keyword detection
]);

export const conversationAssigneeRoleEnum = pgEnum('conversation_assignee_role', [
  'primary',
  'cc',
  'observer',
]);

export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound', 'system']);

export const messageStatusEnum = pgEnum('message_status', [
  'queued',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
]);

export const messageContentTypeEnum = pgEnum('message_content_type', [
  'text',
  'image',
  'video',
  'audio',
  'file',
  'sticker',
  'location',
  'voice_note',
  'system_notice',
  'template',
]);

export const senderRoleEnum = pgEnum('sender_role', [
  'patient',
  'agent', // EarlyMedi staff
  'ai_concierge',
  'system',
  'partner', // partner-side reply
  'hospital', // hospital-side reply (Phase 3)
]);

export const aiToneEnum = pgEnum('ai_tone', ['concise', 'friendly', 'luxury']);
