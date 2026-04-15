import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  parseISO,
  getYear,
  getMonth,
  getDate,
} from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';
import { getLunarDate, getHolidaysForYear } from '../../lib/korean';

const MONTHS = Array.from({ length: 12 }, (_, i) => i); // 0~11
const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function YearView() {
  const { currentDate, setCurrentDate, setView, getExpandedEvents } = useCalendarStore();
  const year = getYear(currentDate);
  const today = new Date();

  const holidayMap = useMemo(() => getHolidaysForYear(year), [year]);

  // 연간 전체 이벤트
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const events = getExpandedEvents(yearStart, yearEnd);

  const hasEvent = (date: Date) =>
    events.some((e) => isSameDay(parseISO(e.startAt), date));

  return (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 p-2">
        {MONTHS.map((monthIdx) => (
          <MiniMonth
            key={monthIdx}
            year={year}
            month={monthIdx}
            today={today}
            currentDate={currentDate}
            holidayMap={holidayMap}
            hasEvent={hasEvent}
            onClickDate={(d) => {
              setCurrentDate(d);
              setView('day');
            }}
            onClickTitle={() => {
              setCurrentDate(new Date(year, monthIdx, 1));
              setView('month');
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniMonth({
  year,
  month,
  today,
  currentDate,
  holidayMap,
  hasEvent,
  onClickDate,
  onClickTitle,
}: {
  year: number;
  month: number;
  today: Date;
  currentDate: Date;
  holidayMap: Map<string, { name: string; isHoliday: boolean }>;
  hasEvent: (d: Date) => boolean;
  onClickDate: (d: Date) => void;
  onClickTitle: () => void;
}) {
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* 월 제목 */}
      <button
        onClick={onClickTitle}
        className="text-base font-bold text-gray-900 mb-2 hover:underline"
      >
        {month + 1}월
      </button>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400">
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, currentDate);
          const y = getYear(day);
          const m = getMonth(day) + 1;
          const dd = getDate(day);
          const holiday = holidayMap.get(
            `${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
          );
          const lunar = inMonth ? getLunarDate(y, m, dd) : null;
          const showLunar = lunar && (lunar.day === 1 || lunar.day === 15);
          const hasEvt = inMonth && hasEvent(day);

          return (
            <button
              key={i}
              onClick={() => onClickDate(day)}
              title={
                (holiday ? `${holiday.name}\n` : '') +
                (lunar ? `음력 ${lunar.label}` : '')
              }
              className={`relative text-center py-0.5 text-xs rounded transition-colors
                ${!inMonth ? 'text-gray-200' : 'text-gray-700 hover:bg-gray-100'}
                ${isSelected ? 'bg-gray-900 text-white hover:bg-gray-700' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-gray-400 font-bold' : ''}
                ${holiday && holiday.isHoliday && inMonth && !isSelected ? 'text-red-500 font-semibold' : ''}
              `}
            >
              <span>{dd}</span>
              {/* 음력 1일/15일 표시 */}
              {showLunar && inMonth && (
                <div className={`text-[7px] leading-tight ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                  {lunar.day === 1 ? `${lunar.month}월` : '보름'}
                </div>
              )}
              {/* 이벤트 점 */}
              {hasEvt && !isSelected && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
