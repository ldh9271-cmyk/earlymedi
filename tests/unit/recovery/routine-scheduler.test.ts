import { describe, it, expect } from 'vitest';
import { buildSchedule, BUILTIN_TEMPLATES, findBuiltinTemplate } from '@/lib/recovery/routine-scheduler';
import {
  classifyAnomaly,
  isOverdue,
  noResponseRecipient,
  GRACE_HOURS_BY_KIND,
} from '@/lib/recovery/escalation';

describe('routine-scheduler', () => {
  it('fires at 10:00 in patient timezone, regardless of agency tz', () => {
    const out = buildSchedule({
      startedOn: '2026-06-01',
      patientTimezone: 'Asia/Riyadh', // UTC+3
      tasks: [{ offsetDays: 0, kind: 'message_check_in', title: 'Welcome' }],
    });
    // 10:00 in Riyadh = 07:00 UTC
    expect(out[0]?.scheduledAtUtc).toBe('2026-06-01T07:00:00.000Z');
  });

  it('offsets days correctly across month boundaries', () => {
    const out = buildSchedule({
      startedOn: '2026-05-30',
      patientTimezone: 'Asia/Seoul', // UTC+9
      tasks: [{ offsetDays: 7, kind: 'photo_check_in', title: 'D+7' }],
    });
    // 2026-06-06 10:00 Asia/Seoul = 2026-06-06 01:00 UTC
    expect(out[0]?.scheduledAtUtc).toBe('2026-06-06T01:00:00.000Z');
  });

  it('preserves task metadata', () => {
    const out = buildSchedule({
      startedOn: '2026-06-01',
      patientTimezone: 'Asia/Seoul',
      tasks: [{ offsetDays: 3, kind: 'pain_score', title: 'D+3', requiresResponse: true }],
    });
    expect(out[0]).toMatchObject({ offsetDays: 3, kind: 'pain_score', requiresResponse: true });
  });

  it('builds the full plastic-surgery template (11 tasks)', () => {
    const tpl = findBuiltinTemplate('plastic_surgery');
    expect(tpl).not.toBeNull();
    const out = buildSchedule({
      startedOn: '2026-06-01',
      patientTimezone: 'Asia/Seoul',
      tasks: tpl?.tasks ?? [],
    });
    expect(out.length).toBe(11);
    // First D+1 task, last D+365 task
    expect(out[0]?.offsetDays).toBe(1);
    expect(out[out.length - 1]?.offsetDays).toBe(365);
  });

  it('includes 6 built-in category templates', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(BUILTIN_TEMPLATES.map((t) => t.procedureCategory)).toEqual(
      expect.arrayContaining(['plastic_surgery', 'dermatology', 'hair', 'dental', 'ophthalmology', 'checkup']),
    );
  });
});

describe('escalation.isOverdue', () => {
  it('respects per-kind grace window', () => {
    expect(GRACE_HOURS_BY_KIND.pain_score).toBe(24);
    const past = new Date('2026-06-01T00:00:00Z');
    const now = new Date('2026-06-02T01:00:00Z'); // +25h
    expect(
      isOverdue({ kind: 'pain_score', scheduledAt: past, requiresResponse: true, status: 'sent', now }),
    ).toBe(true);
  });

  it('not overdue when patient responded', () => {
    const past = new Date('2026-06-01T00:00:00Z');
    const now = new Date('2026-06-09T00:00:00Z');
    expect(
      isOverdue({
        kind: 'pain_score',
        scheduledAt: past,
        requiresResponse: true,
        status: 'patient_responded',
        now,
      }),
    ).toBe(false);
  });

  it('not overdue when response not required', () => {
    const past = new Date('2026-06-01T00:00:00Z');
    const now = new Date('2026-06-30T00:00:00Z');
    expect(
      isOverdue({
        kind: 'restriction_reminder',
        scheduledAt: past,
        requiresResponse: false,
        status: 'sent',
        now,
      }),
    ).toBe(false);
  });
});

describe('escalation.classifyAnomaly', () => {
  it('critical keyword overrides numeric', () => {
    const r = classifyAnomaly({ overallRiskScore: 0, patientText: '피가 많이 나요' });
    expect(r.severity).toBe('critical');
    expect(r.recipient).toBe('medical_director');
    expect(r.reasons).toContain('keyword_critical');
  });

  it('high pain score → critical to doctor', () => {
    const r = classifyAnomaly({ overallRiskScore: 0, painScore: 9 });
    expect(r.severity).toBe('critical');
    expect(r.recipient).toBe('doctor');
  });

  it('AI risk 65 → warning to doctor', () => {
    const r = classifyAnomaly({ overallRiskScore: 65 });
    expect(r.severity).toBe('warning');
    expect(r.recipient).toBe('doctor');
  });

  it('clean signals → info to case manager', () => {
    const r = classifyAnomaly({ overallRiskScore: 20, painScore: 2 });
    expect(r.severity).toBe('info');
    expect(r.recipient).toBe('case_manager');
  });
});

describe('escalation.noResponseRecipient', () => {
  it('pain silence on D+1+ escalates to doctor', () => {
    expect(noResponseRecipient('pain_score', 1)).toBe('doctor');
  });

  it('photo silence under 5 days → case manager', () => {
    expect(noResponseRecipient('photo_check_in', 2)).toBe('case_manager');
  });

  it('any task silenced 5+ days → doctor', () => {
    expect(noResponseRecipient('photo_check_in', 5)).toBe('doctor');
  });
});
