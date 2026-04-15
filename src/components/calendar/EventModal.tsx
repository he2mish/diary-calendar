import { useState, useEffect } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import type { RecurrenceRule } from '../../types';
import { EVENT_COLORS } from '../../types';
import { format, parseISO } from 'date-fns';

export default function EventModal() {
  const {
    isEventModalOpen,
    isEventModalReadonly,
    selectedEvent,
    modalDate,
    modalTime,
    closeEventModal,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceRule['type']>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const isEditing = !!selectedEvent;

  useEffect(() => {
    if (selectedEvent) {
      const start = parseISO(selectedEvent.startAt);
      const end = parseISO(selectedEvent.endAt);
      setTitle(selectedEvent.title);
      setDescription(selectedEvent.description);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
      setAllDay(selectedEvent.allDay);
      setColor(selectedEvent.color);
      if (selectedEvent.recurrenceRule) {
        setUseRecurrence(true);
        setRecurrenceType(selectedEvent.recurrenceRule.type);
        setRecurrenceInterval(selectedEvent.recurrenceRule.interval);
        setRecurrenceDays(selectedEvent.recurrenceRule.daysOfWeek || []);
        setRecurrenceEndDate(selectedEvent.recurrenceRule.endDate || '');
      } else {
        setUseRecurrence(false);
      }
    } else {
      const date = modalDate || format(new Date(), 'yyyy-MM-dd');
      const sTime = modalTime || '09:00';
      const sHour = parseInt(sTime.split(':')[0], 10);
      const eHour = String(Math.min(sHour + 1, 23)).padStart(2, '0');
      const eTime = `${eHour}:${sTime.split(':')[1] || '00'}`;
      setTitle('');
      setDescription('');
      setStartDate(date);
      setStartTime(sTime);
      setEndDate(date);
      setEndTime(eTime);
      setAllDay(false);
      setColor(EVENT_COLORS[0].value);
      setUseRecurrence(false);
      setRecurrenceType('weekly');
      setRecurrenceInterval(1);
      setRecurrenceDays([]);
      setRecurrenceEndDate('');
    }
  }, [selectedEvent, modalDate, modalTime]);

  if (!isEventModalOpen) return null;

  // 읽기 전용 모달
  if (isEventModalReadonly && selectedEvent) {
    const start = parseISO(selectedEvent.startAt);
    const end = parseISO(selectedEvent.endAt);
    return (
      <div className="modal-overlay" onClick={closeEventModal}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: selectedEvent.color }}
            />
            <h2 className="text-lg font-bold">{selectedEvent.title}</h2>
          </div>

          <div className="flex flex-col gap-3 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16 shrink-0">날짜</span>
              <span>
                {selectedEvent.allDay
                  ? format(start, 'yyyy.MM.dd')
                  : `${format(start, 'yyyy.MM.dd HH:mm')} ~ ${format(end, 'HH:mm')}`}
              </span>
            </div>

            {selectedEvent.description && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 shrink-0">설명</span>
                <span className="whitespace-pre-wrap">{selectedEvent.description}</span>
              </div>
            )}

            {selectedEvent.recurrenceRule && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">반복</span>
                <span>
                  {selectedEvent.recurrenceRule.type === 'daily' ? '매일' :
                   selectedEvent.recurrenceRule.type === 'weekly' ? '매주' :
                   selectedEvent.recurrenceRule.type === 'monthly' ? '매월' :
                   selectedEvent.recurrenceRule.type === 'yearly' ? '매년' : '사용자 지정'}
                  {selectedEvent.recurrenceRule.interval > 1 ? ` ${selectedEvent.recurrenceRule.interval}번째` : ''}
                </span>
              </div>
            )}

            {selectedEvent.ownerName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">작성자</span>
                <span>
                  {selectedEvent.ownerName}
                  {selectedEvent.isShared && (
                    <span className="text-xs text-gray-400 ml-1">(공유)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={closeEventModal} className="btn-secondary">
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!title.trim()) return;

    const startAt = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}:00`).toISOString();
    const endAt = allDay
      ? new Date(`${endDate}T23:59:59`).toISOString()
      : new Date(`${endDate}T${endTime}:00`).toISOString();

    const recurrenceRule: RecurrenceRule | null = useRecurrence
      ? {
          type: recurrenceType,
          interval: recurrenceInterval,
          daysOfWeek: recurrenceType === 'custom' ? recurrenceDays : undefined,
          endDate: recurrenceEndDate || undefined,
        }
      : null;

    if (isEditing) {
      const realId = selectedEvent!.parentEventId || selectedEvent!.id;
      updateEvent(realId, {
        title,
        description,
        startAt,
        endAt,
        allDay,
        color,
        recurrenceRule,
      });
    } else {
      addEvent({
        title,
        description,
        startAt,
        endAt,
        allDay,
        color,
        recurrenceRule,
        parentEventId: null,
      });
    }
    closeEventModal();
  };

  const handleDelete = () => {
    if (!selectedEvent) return;
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    const realId = selectedEvent.parentEventId || selectedEvent.id;
    deleteEvent(realId);
    closeEventModal();
  };

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const toggleDay = (day: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="modal-overlay" onClick={closeEventModal}>
      <div className="modal-content overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">
          {isEditing ? '일정 수정' : '새 일정'}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <input
            type="text"
            placeholder="일정 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field text-base font-medium"
            autoFocus
          />

          {/* All day toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            하루 종일
          </label>

          {/* Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">시작일</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} className="input-field" />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">종료일</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field" />
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">색상</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c.value ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <textarea
            placeholder="설명 (선택사항)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field h-20 resize-none"
          />

          {/* Recurrence */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useRecurrence}
                onChange={(e) => setUseRecurrence(e.target.checked)}
                className="rounded"
              />
              반복 일정
            </label>

            {useRecurrence && (
              <div className="mt-3 flex flex-col gap-3 pl-6">
                <div className="flex items-center gap-2">
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceRule['type'])}
                    className="input-field w-auto"
                  >
                    <option value="daily">매일</option>
                    <option value="weekly">매주</option>
                    <option value="monthly">매월</option>
                    <option value="yearly">매년</option>
                    <option value="custom">사용자 지정</option>
                  </select>
                  <span className="text-sm text-gray-500">마다</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    className="input-field w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">
                    {recurrenceType === 'daily' ? '일' : recurrenceType === 'weekly' ? '주' : recurrenceType === 'monthly' ? '개월' : recurrenceType === 'yearly' ? '년' : ''}
                  </span>
                </div>

                {recurrenceType === 'custom' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">반복 요일</label>
                    <div className="flex gap-1">
                      {dayLabels.map((label, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleDay(idx)}
                          className={`w-8 h-8 rounded-full text-xs font-medium ${
                            recurrenceDays.includes(idx)
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">반복 종료일 (선택)</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="input-field w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <div>
            {isEditing && (
              <button onClick={handleDelete} className="btn-danger">
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={closeEventModal} className="btn-secondary">
              취소
            </button>
            <button onClick={handleSave} className="btn-primary">
              {isEditing ? '수정' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
