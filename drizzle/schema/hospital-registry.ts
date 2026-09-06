import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { hospitals } from './hospitals';
import { organizations } from './organizations';

/**
 * hospital_registry — 전국 의료기관 레지스트리 (건강보험심사평가원 원천).
 *
 * `hospitals` 는 플랫폼과 계약한(또는 에이전시가 등록한) 병원 listing 이고,
 * 이 테이블은 국내 모든 요양기관(병원·의원·치과·한의원 등)의 공공 기본
 * 정보다. 공개 병원 찾기(/clinics/all)는 이 테이블을 기준으로 전체를
 * 보여주되,
 *   - contracted_hospital_id 가 있으면 "계약 병원" → 컬러 카드 + 상세 listing
 *   - 없으면 흑백 카드 + 공공정보 상세 + "우리 병원 정보 직접 등록" CTA
 *   - foreign_licensed 면 "외국인 진료 가능" 배지 (외국인환자 유치기관 등록)
 *
 * ykiho 는 심평원이 1:1 매칭으로 제공하는 암호화 요양기호 — 상세 API
 * (진료과목·진료시간·교통) 조회 키이자 유일키.
 */
export type RegistryDepartment = { code: string; name: string; doctors: number };
export type RegistryHours = {
  /** 요일별 [시작, 종료] "HHMM" — 없으면 휴진. mon..sun */
  mon?: [string, string]; tue?: [string, string]; wed?: [string, string]; thu?: [string, string];
  fri?: [string, string]; sat?: [string, string]; sun?: [string, string];
  lunchWeek?: string; lunchSat?: string;
  receptionWeek?: string; receptionSat?: string;
  closedHoliday?: string; closedSunday?: string;
  emergencyDay?: boolean; emergencyNight?: boolean;
  parking?: { spaces?: number; paid?: boolean; note?: string };
  landmark?: { name?: string; direction?: string; distance?: string };
};
export type RegistryTransport = { type: string; line?: string; station?: string; exit?: string; distance?: string; note?: string };
export type RegistryDetails = {
  departments?: RegistryDepartment[];
  hours?: RegistryHours;
  transport?: RegistryTransport[];
  specialtyDesignations?: string[]; // 전문병원 지정분야
  foreignCountries?: string[]; // 외국인환자 유치 대상 국가 (복지부 등록 현황)
  equipment?: Array<{ name: string; count: number }>;
  // 병원이 직접 입력(클레임 승인 후)한 소개·사진 등
  intro?: string;
  photos?: string[];
  languages?: string[];
};

export const hospitalRegistry = pgTable(
  'hospital_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ykiho: text('ykiho').notNull(),
    name: text('name').notNull(),

    clCd: text('cl_cd'), // 종별코드 (01 상급종합 · 11 종합병원 · 21 병원 · 28 요양병원 · 31 의원 · 41 치과병원 · 51 치과의원 · 61 조산원 · 71 보건소 … 92 한의원)
    clName: text('cl_name'),
    sidoCd: text('sido_cd'),
    sidoName: text('sido_name'),
    sgguCd: text('sggu_cd'),
    sgguName: text('sggu_name'),
    emdongName: text('emdong_name'),
    postNo: text('post_no'),
    addr: text('addr'),
    tel: text('tel'),
    url: text('url'),
    estbDate: text('estb_date'), // YYYYMMDD

    drTotal: integer('dr_total').notNull().default(0),
    drGeneral: integer('dr_general').notNull().default(0),
    drSpecialist: integer('dr_specialist').notNull().default(0),
    drDental: integer('dr_dental').notNull().default(0),
    drOriental: integer('dr_oriental').notNull().default(0),

    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),

    // 외국인환자 유치 의료기관 등록 여부 (보건복지부/보건산업진흥원 명단)
    foreignLicensed: boolean('foreign_licensed').notNull().default(false),
    foreignLicensedSource: text('foreign_licensed_source'),
    foreignLicensedAt: timestamp('foreign_licensed_at', { withTimezone: true }),

    // 플랫폼 계약 병원 연결 — 있으면 컬러, 없으면 흑백
    contractedHospitalId: uuid('contracted_hospital_id').references(() => hospitals.id, { onDelete: 'set null' }),

    // 병원 직접 등록(클레임): 병원 관계자가 파트너센터 가입 시 이 행을 지정
    claimOrgId: uuid('claim_org_id').references(() => organizations.id, { onDelete: 'set null' }),
    claimStatus: text('claim_status').notNull().default('none'), // none | pending | approved | rejected
    claimedAt: timestamp('claimed_at', { withTimezone: true }),

    details: jsonb('details').$type<RegistryDetails>().notNull().default(sql`'{}'::jsonb`),
    // 심평원 진료과목 코드(dgsbjtCd) — 과별 카테고리 필터 (getHospBasisList?dgsbjtCd= 로 수집)
    deptCodes: text('dept_codes').array().notNull().default(sql`'{}'::text[]`),
    deptsSyncedAt: timestamp('depts_synced_at', { withTimezone: true }),
    detailsSyncedAt: timestamp('details_synced_at', { withTimezone: true }),
    source: text('source').notNull().default('hira_api'), // hira_api | hira_file
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ykihoUnique: uniqueIndex('hospital_registry_ykiho_unique').on(t.ykiho),
    regionIdx: index('hospital_registry_region_idx').on(t.sidoCd, t.sgguCd),
    clIdx: index('hospital_registry_cl_idx').on(t.clCd),
    nameIdx: index('hospital_registry_name_idx').on(t.name),
    contractedIdx: index('hospital_registry_contracted_idx').on(t.contractedHospitalId),
    foreignIdx: index('hospital_registry_foreign_idx').on(t.foreignLicensed),
  }),
);

export type HospitalRegistryRow = typeof hospitalRegistry.$inferSelect;

/** 심평원 종별코드 → 한글 종별명 (API 가 clCdNm 을 주지만 파일 적재용 폴백). */
export const CL_CODE_NAME: Record<string, string> = {
  '01': '상급종합병원', '11': '종합병원', '21': '병원', '28': '요양병원', '29': '정신병원',
  '31': '의원', '41': '치과병원', '51': '치과의원', '61': '조산원',
  '71': '보건소', '72': '보건지소', '73': '보건진료소', '75': '보건의료원',
  '81': '약국', '92': '한의원', '93': '한방병원',
};

/** 병원급 이상(입원 가능) 종별 — 목록 기본 정렬·필터에 사용. */
export const HOSPITAL_GRADE_CL_CODES = ['01', '11', '21', '28', '29', '41', '93'];
