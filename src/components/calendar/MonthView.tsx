import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
  getYear,
  getMonth,
  getDate,
} from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';
import EventCard from './EventCard';
import { getLunarDate, getHolidaysForYear } from '../../lib/korean';

export default function MonthView() {
  const { currentDate, getExpandedEvents, openEventModal, setCurrentDate, setView } = useCalendarStore();
  const today = new Date();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const events = getExpandedEvents(calStart, calEnd);
  const holidayMap = useMemo(() => getHolidaysForYear(getYear(currentDate)), [getYear(currentDate)]);

  const weeks: Date[][] = [];
  let day = calStart;
  let week: Date[] = [];
  while (day <= calEnd) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    day = addDays(day, 1);
  }

  const getEventsForDay = (date: Date) =>
    events.filter((e) => {
      const start = parseISO(e.startAt);
      const end = parseISO(e.endAt);
      if (e.allDay) {
        // 종일 일정: 시작일~종료일 범위 안이면 표시
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return start <= dayEnd && end >= dayStart;
      }
      return isSameDay(start, date);
    });

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={`text-center py-2 text-sm font-medium ${
              i === 0 ? 'text-gray-400' : i === 6 ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {weeks.map((wk, wi) =>
          wk.map((day, di) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, today);
            const dayEvents = getEventsForDay(day);
            const dateStr = format(day, 'yyyy-MM-dd');

            const y = getYear(day);
            const m = getMonth(day) + 1;
            const dd = getDate(day);
            const lunar = getLunarDate(y, m, dd);
            const holidayKey = `${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            const holiday = holidayMap.get(holidayKey);

            // 음력 표시: 1일이면 "음X월", 아니면 음력 일만
            const lunarLabel = lunar
              ? lunar.day === 1
                ? `${lunar.month}월`
                : `${lunar.day}`
              : '';

            return (
              <div
                key={`${wi}-${di}`}
                onClick={() => {
                  setCurrentDate(day);
                  setView('day');
                }}
                className={`group border-b border-r border-gray-100 p-1 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm w-7 h-7 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-gray-900 text-white'
                          : !isCurrentMonth
                            ? 'text-gray-300'
                            : holiday?.isHoliday
                              ? 'text-red-500 font-semibold'
                              : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {isCurrentMonth && (
                      <span className="text-[10px] text-gray-400 leading-none">
                        {lunarLabel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventModal(dateStr);
                    }}
                    className="text-gray-300 hover:text-gray-900 text-lg leading-none opacity-0 group-hover:opacity-100 hover:opacity-100"
                    title="일정 추가"
                  >
                    +
                  </button>
                </div>
                {/* 공휴일 이름 */}
                {holiday && isCurrentMonth && (
                  <div className="text-[10px] text-red-500 font-medium px-0.5 truncate mb-0.5">
                    {holiday.name}
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} compact />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-400 px-1">
                      +{dayEvents.length - 3}개 더
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
