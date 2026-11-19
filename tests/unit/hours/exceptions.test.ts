import { describe, expect, it } from 'vitest';
import { formatHoursExceptions, parseHoursExceptions, upcomingExceptions } from '@/lib/hours/exceptions';
import { computeOpenStatus, exceptionOn, type WeeklyHours } from '@/lib/hours/status';

// VS라인의원 강남점 2027 공지 — 병원이 보낸 문장을 그대로 붙여 넣는 경우
const NOTICE = `2027 휴무 일정 공유드립니다!

1/1(금) 휴무
2/6(토) 설연휴 첫날 특별진료
2/7,8 설연휴 휴무
2/9(화) 대체공휴일 특별진료
3/1(월) 휴무
5/1(토) 특별진료
12/25(토) 크리스마스 휴무
12/27(월) 대체공휴일 특별진료`;

describe('parseHoursExceptions', () => {
  it('병원 공지 문장을 날짜별 예외로 읽는다 (나열·요일 괄호·메모)', () => {
    const { list, errors } = parseHoursExceptions(NOTICE, 2027);
    expect(errors).toEqual(['2027 휴무 일정 공유드립니다!']); // 날짜가 없는 제목 줄만 못 읽는다
    expect(list.map((e) => `${e.date} ${e.kind}`)).toEqual([
      '2027-01-01 closed', '2027-02-06 open', '2027-02-07 closed', '2027-02-08 closed', '2027-02-09 open',
      '2027-03-01 closed', '2027-05-01 open', '2027-12-25 closed', '2027-12-27 open',
    ]);
    expect(list.find((e) => e.date === '2027-02-07')?.note).toBe('설연휴');
    expect(list.find((e) => e.date === '2027-02-06')?.note).toBe('설연휴 첫날');
    expect(list.find((e) => e.date === '2027-12-25')?.note).toBe('크리스마스');
    expect(list.find((e) => e.date === '2027-02-09')?.note).toBe('대체공휴일');
    expect(list.find((e) => e.date === '2027-05-01')?.note).toBeUndefined();
  });

  it('정규형(YYYY-MM-DD)·시간·범위 나열·중복 날짜를 처리한다', () => {
    const { list, errors } = parseHoursExceptions('2027-02-09 특별진료 10:00~17:00 대체공휴일\n9/15~16 추석 휴무\n2027.10.9 한글날 특별진료\n2027-02-09 휴무\n# 주석\n\n이상한 줄', 2027);
    expect(errors).toEqual(['이상한 줄']);
    expect(list.map((e) => e.date)).toEqual(['2027-02-09', '2027-09-15', '2027-09-16', '2027-10-09']);
    expect(list[0]).toEqual({ date: '2027-02-09', kind: 'closed' }); // 같은 날짜는 뒤 줄이 이긴다
    expect(list[1]).toEqual({ date: '2027-09-15', kind: 'closed', note: '추석' });
    const { list: l2 } = parseHoursExceptions('2027-02-09 특별진료 10:00~17:00 대체공휴일', 2027);
    expect(l2[0]).toEqual({ date: '2027-02-09', kind: 'open', hours: ['1000', '1700'], note: '대체공휴일' });
  });

  it('없는 날짜는 오류로 돌려준다', () => {
    const { list, errors } = parseHoursExceptions('2/30 휴무\n2027-13-01 특별진료', 2027);
    expect(list).toEqual([]);
    expect(errors).toHaveLength(2);
  });

  it('format → parse 왕복이 같다', () => {
    const { list } = parseHoursExceptions(NOTICE, 2027);
    const text = formatHoursExceptions(list);
    expect(text.split('\n')[0]).toBe('2027-01-01 휴무');
    expect(text).toContain('2027-02-06 특별진료 설연휴 첫날');
    expect(parseHoursExceptions(text, 2030).list).toEqual(list); // 정규형은 기준 연도와 무관
  });

  it('upcomingExceptions 는 오늘 이후만 날짜순으로 자른다', () => {
    const { list } = parseHoursExceptions(NOTICE, 2027);
    const up = upcomingExceptions(list, '2027-02-08', 3);
    expect(up.map((e) => e.date)).toEqual(['2027-02-08', '2027-02-09', '2027-03-01']);
  });
});

describe('computeOpenStatus with exceptions', () => {
  // 평일 10~19, 토 10~16, 일 휴진, 공휴일 휴진 — VS라인의원 강남점 꼴의 가상 시간표
  const hours: WeeklyHours = {
    mon: ['1000', '1900'], tue: ['1000', '1900'], wed: ['1000', '1900'], thu: ['1000', '1900'], fri: ['1000', '1900'], sat: ['1000', '1600'],
    lunchWeek: '13:00~14:00', closedHoliday: 'Y',
    exceptions: parseHoursExceptions(NOTICE, 2027).list,
  };
  const holidays = ['2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-01', '2027-12-25', '2027-12-27'];
  const kst = (ymd: string, hm: string): Date => new Date(`${ymd}T${hm}:00+09:00`);

  it('휴무 공지일(공휴일)은 휴진 + 예외 표시, 다음 진료는 특별진료일로 넘어간다', () => {
    const s = computeOpenStatus(hours, kst('2027-02-07', '11:00'), holidays); // 일요일·설날
    expect(s.state).toBe('closed_today');
    expect(s.exception).toEqual({ kind: 'closed', note: '설연휴' });
    expect(s.opensAt).toEqual({ dayOffset: 2, day: 'tue', time: '10:00' }); // 2/8 휴무를 건너뛰고 2/9 특별진료
  });

  it('공휴일 특별진료(시간 미기재)는 그 요일의 평소 시간으로 진료 중', () => {
    const s = computeOpenStatus(hours, kst('2027-02-09', '14:30'), holidays); // 화요일·대체공휴일
    expect(s.state).toBe('open');
    expect(s.until).toBe('19:00');
    expect(s.isHoliday).toBe(true);
    expect(s.exception).toEqual({ kind: 'open', note: '대체공휴일' });
    const sat = computeOpenStatus(hours, kst('2027-02-06', '15:45'), holidays); // 토요일 특별진료 → 토요일 시간
    expect(sat.state).toBe('closing_soon');
    expect(sat.until).toBe('16:00');
  });

  it('특별진료에 시간을 적으면 그 시간을 쓴다', () => {
    const h2: WeeklyHours = { ...hours, exceptions: [{ date: '2027-02-09', kind: 'open', hours: ['1000', '1700'] }] };
    expect(computeOpenStatus(h2, kst('2027-02-09', '17:30'), holidays).state).toBe('closed');
    expect(computeOpenStatus(h2, kst('2027-02-09', '16:45'), holidays)).toMatchObject({ state: 'closing_soon', until: '17:00' });
  });

  it('공휴일이 아닌 날의 휴무 공지도 휴진으로 본다 · 예외가 없는 날은 기존과 같다', () => {
    const h3: WeeklyHours = { ...hours, exceptions: [{ date: '2027-05-13', kind: 'closed', note: '원내 행사' }] };
    expect(computeOpenStatus(h3, kst('2027-05-13', '11:00'), []).state).toBe('closed_today'); // 목요일
    expect(computeOpenStatus(h3, kst('2027-05-12', '11:00'), []).state).toBe('open');
    expect(exceptionOn(h3, '2027-05-12')).toBeUndefined();
  });

  it('badge 라벨: 예외 휴무는 공휴일이어도 오늘 휴진, 공휴일 특별진료는 특별진료 접두', async () => {
    const { describeOpenStatus } = await import('@/components/shared/open-status-badge');
    const t = { open: '진료 중', closingSoon: '곧 종료', lunch: '점심', closed: '종료', closedToday: '오늘 휴진', holidayClosed: '공휴일 휴진', until: '{time}까지', opensToday: '{time}', opensTomorrow: '내일 {time}', opensOn: '{day} {time}', days: ['월', '화', '수', '목', '금', '토', '일'], liveNote: '', special: '특별진료' };
    expect(describeOpenStatus(computeOpenStatus(hours, kst('2027-02-07', '11:00'), holidays), t)?.main).toBe('오늘 휴진');
    expect(describeOpenStatus(computeOpenStatus(hours, kst('2027-02-09', '14:30'), holidays), t)).toEqual({ main: '진료 중', sub: '특별진료 · 19:00까지' });
    expect(describeOpenStatus(computeOpenStatus(hours, kst('2027-02-10', '14:30'), holidays), t)).toEqual({ main: '진료 중', sub: '19:00까지' });
  });
});
