import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * ai_face_analyses — 사진 업로드 → AI 얼굴 분석 결과.
 * 사진은 저장하지 않는다(dict.ai.note). 분석 코멘트와 추천 카드만 보관해
 * '결과를 이메일로 받기' → 회원가입/로그인 → 돌아와 계정 이메일로 발송하는 흐름을 잇는다.
 */
export type FaceAnalysis = {
  personalColorSeason: string; personalColorNote: string; skinNote: string; hairNote: string; browNote: string; overallNote: string;
  clinicCategory?: string;
};
export type FaceRecSection = { key: string; items: Array<{ title: string; href: string; img: string | null; promo: string | null }> };

export const aiFaceAnalyses = pgTable(
  'ai_face_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    locale: text('locale').notNull().default('kr'),
    userId: uuid('user_id'),
    email: text('email'),
    analysis: jsonb('analysis').$type<FaceAnalysis>().notNull().default(sql`'{}'::jsonb`),
    recs: jsonb('recs').$type<FaceRecSection[]>().notNull().default(sql`'[]'::jsonb`),
    contact: jsonb('contact').$type<{ phone?: string; messenger?: string; birthDate?: string }>(),
    emailedAt: timestamp('emailed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('ai_face_analyses_user_idx').on(t.userId) }),
);
