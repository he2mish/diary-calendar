import { startOfWeek, addDays, format, isSameDay, parseISO, getHours, getMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCalendarStore, getWeekStart } from '../../stores/calendarStore';
import WeeklyDiaryPanel from '../diary/WeeklyDiaryPanel';
import EventCard from './EventCard';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView() {
  const { currentDate, getExpandedEvents, openEventModal, setCurrentDate, setView } = useCalendarStore();
  const today = new Date();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const events = getExpandedEvents(weekStart, weekEnd);

  const getAllDayEvents = (day: Date) =>
    events.filter((e) => {
      if (!e.allDay) return false;
      const start = parseISO(e.startAt);
      const end = parseISO(e.endAt);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      return start <= dayEnd && end >= dayStart;
    });

  const diaryWeekStart = getWeekStart(currentDate);

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 sm:gap-4">
      {/* Weekly diary panel */}
      <WeeklyDiaryPanel weekStart={diaryWeekStart} />

      {/* Week grid */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[40px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="border-r border-gray-200" />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                className="text-center py-2 border-r border-gray-100"
              >
                <div className={`text-xs ${i === 0 ? 'text-gray-400' : i === 6 ? 'text-gray-400' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ko })}
                </div>
                <button
                  onClick={() => { setCurrentDate(day); setView('day'); }}
                  className={`text-lg font-semibold w-8 h-8 rounded-full inline-flex items-center justify-center ${
                    isToday ? 'bg-gray-900 text-white' : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {format(day, 'd')}
                </button>
                {/* All day events */}
                <div className="px-1 flex flex-col gap-0.5">
                  {getAllDayEvents(day).map((e) => (
                    <EventCard key={e.id} event={e} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {(() => {
          const HOUR_HEIGHT = 48; // px per hour (sm: handled via scale isn't needed, 48px works for both)
          const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

          const getEventPos = (event: typeof events[0]) => {
            const start = parseISO(event.startAt);
            const end = parseISO(event.endAt);
            const startMin = getHours(start) * 60 + getMinutes(start);
            const endMin = Math.min(getHours(end) * 60 + getMinutes(end), 24 * 60);
            const duration = Math.max(endMin - startMin, 10);
            const top = (startMin / (24 * 60)) * TOTAL_HEIGHT;
            const height = (duration / (24 * 60)) * TOTAL_HEIGHT;
            return { top, height };
          };

          const getTimedEventsForDay = (day: Date) =>
            events.filter((e) => {
              if (e.allDay) return false;
              const start = parseISO(e.startAt);
              return isSameDay(start, day);
            });

          return (
            <div className="flex" style={{ height: TOTAL_HEIGHT }}>
              {/* 시간 라벨 */}
              <div className="shrink-0 w-[40px] sm:w-[60px] relative border-r border-gray-100">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full text-[10px] sm:text-xs text-gray-400 text-right pr-1 sm:pr-2 border-b border-gray-50"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* 요일별 컬럼 */}
              {days.map((day, di) => {
                const dayTimedEvents = getTimedEventsForDay(day);
                return (
                  <div key={di} className="flex-1 relative border-r border-gray-50">
                    {/* 시간 그리드 라인 + 클릭 */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          openEventModal(dateStr, undefined, `${String(hour).padStart(2, '0')}:00`);
                        }}
                        className="absolute w-full border-b border-gray-50 cursor-pointer hover:bg-gray-100/30 transition-colors"
                        style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      />
                    ))}
                    {/* 이벤트 블록 */}
                    {dayTimedEvents.map((e) => {
                      const { top, height } = getEventPos(e);
                      return (
                        <div
                          key={e.id}
                          className="absolute left-0.5 right-0.5 z-10"
                          style={{ top, height, minHeight: 16 }}
                        >
                          <div className="h-full">
                            <EventCard event={e} compact />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
