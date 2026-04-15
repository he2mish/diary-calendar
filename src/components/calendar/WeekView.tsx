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

  const getEventsForDayHour = (day: Date, hour: number) =>
    events.filter((e) => {
      const start = parseISO(e.startAt);
      return isSameDay(start, day) && getHours(start) === hour && !e.allDay;
    });

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
        <div className="grid grid-cols-[40px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b border-gray-100 text-[10px] sm:text-xs text-gray-400 text-right pr-1 sm:pr-2 py-1 h-12 sm:h-14">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((day, di) => {
                const hourEvents = getEventsForDayHour(day, hour);
                return (
                  <div
                    key={di}
                    onClick={() => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      openEventModal(dateStr, undefined, `${String(hour).padStart(2, '0')}:00`);
                    }}
                    className="border-r border-b border-gray-50 h-12 sm:h-14 px-0.5 cursor-pointer hover:bg-gray-100/30 relative"
                  >
                    {hourEvents.map((e) => {
                      const start = parseISO(e.startAt);
                      const topOffset = (getMinutes(start) / 60) * 100;
                      return (
                        <div key={e.id} style={{ top: `${topOffset}%` }} className="absolute left-0.5 right-0.5">
                          <EventCard event={e} compact />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
