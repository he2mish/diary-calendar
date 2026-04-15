import type { CalendarEvent } from '../../types';
import { format, parseISO } from 'date-fns';
import { useCalendarStore } from '../../stores/calendarStore';

interface Props {
  event: CalendarEvent;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: Props) {
  const { openEventModal } = useCalendarStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEventModal(undefined, event);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate text-white font-medium"
        style={{ backgroundColor: event.color }}
        title={event.title}
      >
        {!event.allDay && (
          <span className="opacity-80 mr-1">
            {format(parseISO(event.startAt), 'HH:mm')}
          </span>
        )}
        {event.title}
        {event.recurrenceRule && ' ↻'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-3 py-2 rounded-lg text-white text-sm hover:opacity-90 transition-opacity"
      style={{ backgroundColor: event.color }}
    >
      <div className="font-medium">{event.title}{event.recurrenceRule && ' ↻'}</div>
      {!event.allDay && (
        <div className="text-xs opacity-80 mt-0.5">
          {format(parseISO(event.startAt), 'HH:mm')} - {format(parseISO(event.endAt), 'HH:mm')}
        </div>
      )}
      {event.description && (
        <div className="text-xs opacity-70 mt-1 line-clamp-2">{event.description}</div>
      )}
    </button>
  );
}
