import KoreanLunarCalendar from 'korean-lunar-calendar';

const calendar = new KoreanLunarCalendar();

export interface LunarInfo {
  month: number;
  day: number;
  label: string; // "음 1.1" 형태
  isLeapMonth: boolean;
}

export interface HolidayInfo {
  name: string;
  isHoliday: boolean; // 법정 공휴일 여부
}

/** 양력 날짜 → 음력 정보 */
export function getLunarDate(year: number, month: number, day: number): LunarInfo | null {
  try {
    calendar.setSolarDate(year, month, day);
    const lunar = calendar.getLunarCalendar();
    return {
      month: lunar.month,
      day: lunar.day,
      label: `${lunar.month}.${lunar.day}`,
      isLeapMonth: lunar.intercalation ?? false,
    };
  } catch {
    return null;
  }
}

/** 음력 날짜 → 양력 날짜 */
function lunarToSolar(year: number, lunarMonth: number, lunarDay: number, isLeap = false): { year: number; month: number; day: number } | null {
  try {
    calendar.setLunarDate(year, lunarMonth, lunarDay, isLeap);
    const solar = calendar.getSolarCalendar();
    return { year: solar.year, month: solar.month, day: solar.day };
  } catch {
    return null;
  }
}

/** 양력 고정 공휴일 */
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

/** 음력 기반 공휴일 (음력 월-일) */
const LUNAR_HOLIDAYS: { month: number; day: number; name: string; extraDays?: number[] }[] = [
  { month: 1, day: 1, name: '설날', extraDays: [-1, 1] },   // 설 연휴 (전날, 당일, 다음날)
  { month: 4, day: 8, name: '부처님오신날' },
  { month: 8, day: 15, name: '추석', extraDays: [-1, 1] },  // 추석 연휴
];

/** 해당 연도의 모든 공휴일 맵 생성 (key: 'MM-DD') */
export function getHolidaysForYear(year: number): Map<string, HolidayInfo> {
  const holidays = new Map<string, HolidayInfo>();

  // 양력 고정 공휴일
  for (const [key, name] of Object.entries(SOLAR_HOLIDAYS)) {
    holidays.set(key, { name, isHoliday: true });
  }

  // 음력 기반 공휴일
  for (const lh of LUNAR_HOLIDAYS) {
    const days = [0, ...(lh.extraDays || [])];
    for (const offset of days) {
      let targetLunarDay = lh.day + offset;
      let targetLunarMonth = lh.month;

      // 음력 월 넘김 처리 (간단 버전)
      if (targetLunarDay <= 0) {
        targetLunarMonth -= 1;
        targetLunarDay = 30 + targetLunarDay; // 이전 달 말일 근사치
        if (targetLunarMonth <= 0) {
          // 이전 해 12월
          const solar = lunarToSolar(year - 1, 12, targetLunarDay);
          if (solar) {
            const key = `${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
            const suffix = offset !== 0 ? ` 연휴` : '';
            holidays.set(key, { name: lh.name + suffix, isHoliday: true });
          }
          continue;
        }
      }

      const solar = lunarToSolar(year, targetLunarMonth, targetLunarDay);
      if (solar) {
        const key = `${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
        const suffix = offset !== 0 ? ' 연휴' : '';
        holidays.set(key, { name: lh.name + suffix, isHoliday: true });
      }
    }
  }

  // 대체공휴일: 어린이날이 토/일이면 월요일 대체
  const childrenDay = new Date(year, 4, 5); // 5월 5일
  const cdDow = childrenDay.getDay();
  if (cdDow === 0) {
    holidays.set('05-06', { name: '대체공휴일(어린이날)', isHoliday: true });
  } else if (cdDow === 6) {
    holidays.set('05-07', { name: '대체공휴일(어린이날)', isHoliday: true });
  }

  return holidays;
}

/** 특정 날짜의 공휴일 정보 조회 */
export function getHolidayInfo(month: number, day: number, holidayMap: Map<string, HolidayInfo>): HolidayInfo | null {
  const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return holidayMap.get(key) || null;
}
