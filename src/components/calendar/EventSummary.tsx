import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCalendarStore } from '../../stores/calendarStore';

export default function EventSummary() {
  const { isEventSummaryOpen, summaryEvent, closeEventModal, openEventModal } = useCalendarStore();

  if (!isEventSummaryOpen || !summaryEvent) return null;

  const start = parseISO(summaryEvent.startAt);
  const end = parseISO(summaryEvent.endAt);

  const handleEdit = () => {
    closeEventModal();
    // 약간의 딜레이로 모달 전환
    setTimeout(() => {
      openEventModal(undefined, summaryEvent);
    }, 50);
  };

  return (
    <div className="modal-overlay" onClick={closeEventModal}>
      <div className="modal-content overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 색상 바 */}
        <div className="h-2 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 rounded-t-xl mb-4" style={{ backgroundColor: summaryEvent.color }} />

        {/* 제목 */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: summaryEvent.color }}
          />
          {summaryEvent.title}
          {summaryEvent.recurrenceRule && <span className="text-gray-400 text-sm">↻</span>}
        </h2>

        {/* 정보 */}
        <div className="flex flex-col gap-3 text-sm">
          {/* 날짜/시간 */}
          <div className="flex items-start gap-3">
            <span className="text-gray-400 shrink-0 mt-0.5">📅</span>
            <div>
              <p>{format(start, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}</p>
              {!summaryEvent.allDay && (
                <p className="text-gray-500">
                  {format(start, 'a h:mm', { locale: ko })} ~ {format(end, 'a h:mm', { locale: ko })}
                </p>
              )}
              {summaryEvent.allDay && (
                <p className="text-gray-500">하루 종일</p>
              )}
            </div>
          </div>

          {/* 작성자 */}
          {summaryEvent.ownerName && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 shrink-0">👤</span>
              <span>
                {summaryEvent.ownerName}
                {summaryEvent.isShared && (
                  <span className="text-xs text-gray-400 ml-1">(공유)</span>
                )}
              </span>
            </div>
          )}

          {/* 설명 */}
          {summaryEvent.description && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 shrink-0 mt-0.5">📝</span>
              <p className="whitespace-pre-wrap text-gray-700">{summaryEvent.description}</p>
            </div>
          )}

          {/* 반복 */}
          {summaryEvent.recurrenceRule && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 shrink-0">🔄</span>
              <span className="text-gray-700">
                {summaryEvent.recurrenceRule.type === 'daily' ? '매일' :
                 summaryEvent.recurrenceRule.type === 'weekly' ? '매주' :
                 summaryEvent.recurrenceRule.type === 'monthly' ? '매월' :
                 summaryEvent.recurrenceRule.type === 'yearly' ? '매년' : '사용자 지정'}
                {summaryEvent.recurrenceRule.interval > 1 ? ` ${summaryEvent.recurrenceRule.interval}번째` : ''} 반복
              </span>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-6">
          {!summaryEvent.isShared && (
            <button onClick={handleEdit} className="btn-primary flex-1">
              편집
            </button>
          )}
          <button onClick={closeEventModal} className="btn-secondary flex-1">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
