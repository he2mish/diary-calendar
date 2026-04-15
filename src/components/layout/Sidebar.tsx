import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCalendarStore } from '../../stores/calendarStore';
import { useAuthStore } from '../../stores/authStore';
import SharePanel from '../share/SharePanel';

interface Props {
  onClose: () => void;
}

export default function Sidebar({ onClose }: Props) {
  const { currentDate, setCurrentDate, setView, openEventModal } = useCalendarStore();
  const { user, signOut } = useAuthStore();
  const today = new Date();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const handleNav = (d: Date, v: 'month' | 'week' | 'day') => {
    setCurrentDate(d);
    setView(v);
    onClose();
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 p-4 flex flex-col gap-6 overflow-y-auto">
      {/* 모바일 닫기 버튼 */}
      <div className="flex items-center justify-between lg:hidden">
        <span className="font-bold text-lg">nyo DIARY</span>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">✕</button>
      </div>

      <button
        onClick={() => { openEventModal(format(today, 'yyyy-MM-dd')); onClose(); }}
        className="btn-primary w-full text-center"
      >
        + 새 일정
      </button>

      {/* Mini Calendar */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </h3>
        <div className="grid grid-cols-7 gap-0.5 text-xs">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-gray-400 py-1 font-medium">
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            const isCurrentMonth = isSameMonth(d, currentDate);
            const isToday = isSameDay(d, today);
            const isSelected = isSameDay(d, currentDate);
            return (
              <button
                key={i}
                onClick={() => handleNav(d, 'day')}
                className={`text-center py-1 rounded-full text-xs transition-colors
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                  ${isSelected ? 'bg-gray-900 text-white hover:bg-gray-700' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-gray-400 text-gray-900 font-bold' : ''}
                `}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleNav(today, 'month')}
          className="text-left text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          월간 캘린더
        </button>
        <button
          onClick={() => handleNav(today, 'week')}
          className="text-left text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          주간 캘린더 & 일기
        </button>
        <button
          onClick={() => handleNav(today, 'day')}
          className="text-left text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          일간 뷰 & 체크리스트
        </button>
      </div>

      {/* 캘린더 공유 */}
      <SharePanel />

      {/* 사용자 정보 & 로그아웃 */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 truncate px-2 mb-2">{user?.email}</p>
        <button
          onClick={signOut}
          className="w-full text-left text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
