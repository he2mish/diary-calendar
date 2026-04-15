import { useState, useEffect, useRef } from 'react';
import { format, isSameDay, parseISO, getHours, getMinutes } from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';
import DailyChecklist from '../checklist/DailyChecklist';
import EventCard from './EventCard';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView() {
  const { currentDate, getExpandedEvents, openEventModal, scrollToEventId, setScrollToEventId } = useCalendarStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<'timeline' | 'checklist'>('timeline');

  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const events = getExpandedEvents(dayStart, dayEnd).filter((e) => {
    const start = parseISO(e.startAt);
    const end = parseISO(e.endAt);
    if (e.allDay) {
      return start <= dayEnd && end >= dayStart;
    }
    return isSameDay(start, currentDate);
  });

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (!scrollToEventId || !timelineRef.current) return;
    const targetEvent = events.find((e) => e.id === scrollToEventId);
    if (!targetEvent) return;
    setMobileTab('timeline');
    const hour = getHours(parseISO(targetEvent.startAt));
    setTimeout(() => {
      const hourElement = timelineRef.current?.querySelector(`[data-hour="${hour}"]`);
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hourElement.classList.add('bg-gray-100');
        setTimeout(() => {
          hourElement.classList.remove('bg-gray-100');
          setScrollToEventId(null);
        }, 1500);
      } else {
        setScrollToEventId(null);
      }
    }, 100);
  }, [scrollToEventId]);

  const timeline = (
    <div ref={timelineRef} className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 p-3">
          <div className="text-xs text-gray-400 mb-2">하루 종일</div>
          <div className="flex flex-col gap-1">
            {allDayEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
      <div>
        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter(
            (e) => getHours(parseISO(e.startAt)) === hour
          );
          return (
            <div
              key={hour}
              data-hour={hour}
              onClick={() => openEventModal(dateStr, undefined, `${String(hour).padStart(2, '0')}:00`)}
              className="flex border-b border-gray-50 h-16 cursor-pointer hover:bg-gray-100/30 transition-colors"
            >
              <div className="w-12 sm:w-16 text-xs text-gray-400 text-right pr-2 sm:pr-3 py-2 shrink-0">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 relative px-1">
                {hourEvents.map((e) => {
                  const start = parseISO(e.startAt);
                  const topOffset = (getMinutes(start) / 60) * 100;
                  return (
                    <div key={e.id} style={{ top: `${topOffset}%` }} className="absolute left-1 right-1">
                      <EventCard event={e} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 모바일 탭 전환 */}
      <div className="flex sm:hidden mb-2 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mobileTab === 'timeline' ? 'bg-white text-gray-900 shadow-sm border border-gray-300' : 'text-gray-500'
          }`}
        >
          일정
        </button>
        <button
          onClick={() => setMobileTab('checklist')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mobileTab === 'checklist' ? 'bg-white text-gray-900 shadow-sm border border-gray-300' : 'text-gray-500'
          }`}
        >
          체크리스트
        </button>
      </div>

      {/* 데스크톱: 가로 배치 */}
      <div className="hidden sm:flex flex-1 gap-4 min-h-0">
        {timeline}
        <div className="w-80 shrink-0">
          <DailyChecklist date={dateStr} />
        </div>
      </div>

      {/* 모바일: 탭 전환 */}
      <div className="flex sm:hidden flex-1 min-h-0 w-full">
        {mobileTab === 'timeline' ? timeline : (
          <div className="w-full">
            <DailyChecklist date={dateStr} />
          </div>
        )}
      </div>
    </div>
  );
}
