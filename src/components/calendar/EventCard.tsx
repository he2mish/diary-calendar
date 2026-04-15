import type { CalendarEvent } from '../../types';
import { format, parseISO } from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';

interface Props {
  event: CalendarEvent;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: Props) {
  const { openEventSummary } = useCalendarStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEventSummary(event);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`w-full text-left text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded truncate font-medium ${
          event.isShared ? 'border border-white/40' : ''
        }`}
        style={{
          backgroundColor: event.color,
          color: 'white',
          opacity: event.isShared ? 0.85 : 1,
        }}
        title={`${event.title}${event.isShared ? ` (${event.ownerName})` : ''}`}
      >
        {event.isShared && <span className="opacity-70 mr-0.5">👤</span>}
        <span className="hidden sm:inline">
          {!event.allDay && (
            <span className="opacity-80 mr-1">
              {format(parseISO(event.startAt), 'HH:mm')}
            </span>
          )}
        </span>
        {event.title}
        {event.recurrenceRule && ' ↻'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm hover:opacity-90 transition-opacity"
      style={{ backgroundColor: event.color }}
    >
      <div className="flex items-center gap-1">
        <span className="font-medium">{event.title}{event.recurrenceRule && ' ↻'}</span>
      </div>
      {!event.allDay && (
        <div className="text-[10px] sm:text-xs opacity-80 mt-0.5">
          {format(parseISO(event.startAt), 'HH:mm')} - {format(parseISO(event.endAt), 'HH:mm')}
        </div>
      )}
      {event.isShared && event.ownerName && (
        <div className="text-[10px] sm:text-xs opacity-70 mt-0.5">👤 {event.ownerName}</div>
      )}
      {event.description && (
        <div className="text-[10px] sm:text-xs opacity-70 mt-1 line-clamp-2">{event.description}</div>
      )}
    </button>
  );
}
