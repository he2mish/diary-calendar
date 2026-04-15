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

  // 10분 = 1단위, 1시간 = 6단위, 슬롯 높이
  const SLOT_HEIGHT = 10; // px per 10min
  const HOUR_HEIGHT = SLOT_HEIGHT * 6; // 60px per hour
  const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

  const getEventPosition = (event: typeof timedEvents[0]) => {
    const start = parseISO(event.startAt);
    const end = parseISO(event.endAt);
    const startMin = getHours(start) * 60 + getMinutes(start);
    const endMin = Math.min(getHours(end) * 60 + getMinutes(end), 24 * 60);
    const duration = Math.max(endMin - startMin, 10); // 최소 10분
    const top = (startMin / (24 * 60)) * TOTAL_HEIGHT;
    const height = (duration / (24 * 60)) * TOTAL_HEIGHT;
    return { top, height };
  };

  const handleHourClick = (hour: number, e: React.MouseEvent) => {
    // 이벤트 카드 클릭이 아닌 빈 영역 클릭만 처리
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    openEventModal(dateStr, undefined, `${String(hour).padStart(2, '0')}:00`);
  };

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
      <div className="flex" style={{ height: TOTAL_HEIGHT }}>
        {/* 시간 라벨 */}
        <div className="shrink-0 w-12 sm:w-16 relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full text-[10px] sm:text-xs text-gray-400 text-right pr-2 sm:pr-3 border-b border-gray-50"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* 이벤트 영역 */}
        <div className="flex-1 relative">
          {/* 시간 그리드 라인 + 클릭 영역 */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              data-hour={hour}
              onClick={(e) => handleHourClick(hour, e)}
              className="absolute w-full border-b border-gray-50 cursor-pointer hover:bg-gray-100/30 transition-colors"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            />
          ))}

          {/* 이벤트 블록 */}
          {timedEvents.map((e) => {
            const { top, height } = getEventPosition(e);
            return (
              <div
                key={e.id}
                data-event
                className="absolute left-1 right-1 z-10"
                style={{ top, height, minHeight: 20 }}
              >
                <div className="h-full">
                  <EventCard event={e} />
                </div>
              </div>
            );
          })}
        </div>
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
