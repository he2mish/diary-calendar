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
        className={`w-full h-full text-left text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded font-medium overflow-hidden ${
          event.isShared ? 'border border-white/40' : ''
        }`}
        style={{
          backgroundColor: event.color,
          color: 'white',
          opacity: event.isShared ? 0.85 : 1,
        }}
        title={`${event.title}${event.isShared ? ` (${event.ownerName})` : ''}`}
      >
        <div className="truncate">
          {event.isShared && <span className="opacity-70 mr-0.5">👤</span>}
          {!event.allDay && (
            <span className="opacity-80 mr-1 hidden sm:inline">
              {format(parseISO(event.startAt), 'HH:mm')}
            </span>
          )}
          {event.title}
          {event.recurrenceRule && ' ↻'}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full h-full text-left px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-white text-[10px] sm:text-sm hover:opacity-90 transition-opacity overflow-hidden"
      style={{ backgroundColor: event.color }}
    >
      <div className="flex items-center gap-1">
        <span className="font-medium truncate">{event.title}{event.recurrenceRule && ' ↻'}</span>
        {!event.allDay && (
          <span className="opacity-80 shrink-0 text-[9px] sm:text-xs">
            {format(parseISO(event.startAt), 'HH:mm')}-{format(parseISO(event.endAt), 'HH:mm')}
          </span>
        )}
      </div>
      {event.isShared && event.ownerName && (
        <div className="text-[9px] sm:text-xs opacity-70">👤 {event.ownerName}</div>
      )}
      {event.description && (
        <div className="text-[9px] sm:text-xs opacity-70 line-clamp-2">{event.description}</div>
      )}
    </button>
  );
}
