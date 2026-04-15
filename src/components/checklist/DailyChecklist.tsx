import { useState, useRef, useCallback } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import type { CalendarEvent } from '../../types';
import { format, parseISO, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  date: string; // YYYY-MM-DD
}

export default function DailyChecklist({ date }: Props) {
  const {
    getChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    reorderChecklist,
    getExpandedEvents,
    openEventModalReadonly,
    setScrollToEventId,
  } = useCalendarStore();
  const [newItem, setNewItem] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const [hoverEvent, setHoverEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleItemMouseEnter = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setTooltipPos({
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top - 4,
      });
    }
    setHoverEvent(event);
  }, []);

  const handleItemMouseLeave = useCallback(() => {
    setHoverEvent(null);
  }, []);

  const checklist = getChecklist(date);
  const items = checklist.items;
  const completed = items.filter((i) => i.checked).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const dayDate = parseISO(date);
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);
  const dayEvents = getExpandedEvents(dayStart, dayEnd).filter((e) =>
    isSameDay(parseISO(e.startAt), dayDate)
  );

  const findEvent = (eventId: string) =>
    dayEvents.find((e) => e.id === eventId || e.parentEventId === eventId);

  const handleAdd = () => {
    if (!newItem.trim()) return;
    addChecklistItem(date, newItem.trim(), selectedEventId || undefined);
    setNewItem('');
    setSelectedEventId('');
    setShowEventPicker(false);
  };

  const handleAddFromEvent = (eventId: string, title: string) => {
    addChecklistItem(date, title, eventId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd();
  };

  // Drag handlers
  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    // 약간의 지연으로 드래그 중 스타일 적용
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    reorderChecklist(date, newItems.map((item, i) => ({ ...item, order: i })));
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    setDragIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  const dateLabel = format(parseISO(date), 'M월 d일 (EEEE)', { locale: ko });

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span>✅</span> 체크리스트
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        {total > 0 && (
          <span className="text-xs text-gray-500">
            {completed}/{total}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#111827' : '#6b7280',
            }}
          />
        </div>
      )}

      {/* 일정에서 가져오기 */}
      {dayEvents.length > 0 && (
        <div className="mb-3 border border-gray-200 rounded-lg bg-gray-100/50">
          <button
            onClick={() => setShowEventPicker(!showEventPicker)}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-900 flex items-center justify-between"
          >
            <span>📅 일정에서 가져오기</span>
            <span className={`transition-transform ${showEventPicker ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showEventPicker && (
            <div className="px-2 pb-2 flex flex-col gap-1">
              {dayEvents.map((event) => {
                const alreadyLinked = items.some((item) => item.eventId === event.id);
                return (
                  <button
                    key={event.id}
                    onClick={() => !alreadyLinked && handleAddFromEvent(event.id, event.title)}
                    disabled={alreadyLinked}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                      alreadyLinked
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-200 cursor-pointer'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="flex-1 truncate">{event.title}</span>
                    {!event.allDay && (
                      <span className="text-gray-400 shrink-0">
                        {format(parseISO(event.startAt), 'HH:mm')}
                      </span>
                    )}
                    {alreadyLinked && <span className="text-gray-400">추가됨</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {items.map((item, index) => {
          const linkedEvent = item.eventId ? findEvent(item.eventId) : null;
          const isDragOver = dragOverIndex === index && dragIndex !== index;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              onMouseEnter={(e) => linkedEvent && handleItemMouseEnter(linkedEvent, e)}
              onMouseLeave={handleItemMouseLeave}
              className={`flex items-center gap-1.5 group py-1.5 px-2 rounded transition-colors ${
                isDragOver
                  ? 'border-t-2 border-gray-900 bg-gray-50'
                  : 'border-t-2 border-transparent hover:bg-gray-50'
              }`}
            >
              {/* 드래그 핸들 */}
              <span
                className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity select-none"
                title="드래그하여 순서 변경"
              >
                ⠿
              </span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleChecklistItem(date, item.id)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 shrink-0"
              />
              {linkedEvent && (
                <span
                  className="w-2 h-2 rounded-full shrink-0 cursor-pointer"
                  style={{ backgroundColor: linkedEvent.color }}
                  title={`연동: ${linkedEvent.title}`}
                  onClick={() => { setScrollToEventId(linkedEvent.id); openEventModalReadonly(linkedEvent); }}
                />
              )}
              <span
                className={`flex-1 text-sm ${
                  item.checked ? 'line-through text-gray-400' : 'text-gray-700'
                } ${linkedEvent ? 'cursor-pointer hover:text-gray-900' : ''}`}
                onClick={() => linkedEvent && (() => { setScrollToEventId(linkedEvent.id); openEventModalReadonly(linkedEvent); })()}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteChecklistItem(date, item.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
              >
                ✕
              </button>
            </div>
          );
        })}

        {total === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            아직 항목이 없습니다
          </p>
        )}
      </div>

      {/* 호버 툴팁 */}
      {hoverEvent && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateY(-100%)' }}
        >
          <EventTooltip event={hoverEvent} />
        </div>
      )}

      {/* Add item */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {dayEvents.length > 0 && (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="input-field mb-2 text-xs"
          >
            <option value="">연동 없이 추가</option>
            {dayEvents.map((event) => (
              <option key={event.id} value={event.id}>
                🔗 {event.title}
                {!event.allDay ? ` (${format(parseISO(event.startAt), 'HH:mm')})` : ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="할 일 추가..."
            className="input-field flex-1"
          />
          <button onClick={handleAdd} className="btn-primary px-3">
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function EventTooltip({ event }: { event: CalendarEvent }) {
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  return (
    <div className="bg-gray-900 text-white rounded-lg px-3 py-2.5 shadow-lg text-xs w-56">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
        <span className="font-semibold text-sm">{event.title}</span>
      </div>
      <div className="text-gray-300">
        {event.allDay
          ? '하루 종일'
          : `${format(start, 'HH:mm')} ~ ${format(end, 'HH:mm')}`}
      </div>
      {event.description && (
        <div className="text-gray-400 mt-1.5 line-clamp-3 whitespace-pre-wrap">{event.description}</div>
      )}
      {event.recurrenceRule && (
        <div className="text-gray-500 mt-1 text-[10px]">↻ 반복 일정</div>
      )}
    </div>
  );
}
