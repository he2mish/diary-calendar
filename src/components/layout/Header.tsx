import { format, addYears, subYears, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, getYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCalendarStore } from '../../stores/calendarStore';
import NotificationBell from '../notification/NotificationBell';

interface Props {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: Props) {
  const { currentDate, setCurrentDate, view, setView } = useCalendarStore();

  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev'
      ? view === 'year' ? subYears : view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays
      : view === 'year' ? addYears : view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays;
    setCurrentDate(fn(currentDate, 1));
  };

  const getTitle = () => {
    if (view === 'year') return `${getYear(currentDate)}년`;
    if (view === 'month') return format(currentDate, 'yyyy년 M월', { locale: ko });
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'M/d')} ~ ${format(we, 'M/d')}`;
    }
    return format(currentDate, 'M월 d일 (EEE)', { locale: ko });
  };

  const title = getTitle();

  const viewLabels = [
    { key: 'year' as const, label: '년' },
    { key: 'month' as const, label: '월' },
    { key: 'week' as const, label: '주' },
    { key: 'day' as const, label: '일' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-4">
      {/* 상단 행: 메뉴 + 제목 + 네비게이션 + 알림 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* 햄버거 (모바일만) */}
          <button onClick={onMenuToggle} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* 앱 이름 (데스크톱만) */}
          <h1 className="text-2xl font-bold text-gray-900 mr-2 hidden lg:block shrink-0">
            nyo DIARY
          </h1>
          {/* 네비게이션 */}
          <button onClick={() => navigate('prev')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg shrink-0">
            &larr;
          </button>
          <h2 className="text-sm sm:text-lg font-semibold text-center truncate">{title}</h2>
          <button onClick={() => navigate('next')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg shrink-0">
            &rarr;
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 shrink-0"
          >
            오늘
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 뷰 전환 */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 sm:p-1">
            {viewLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  view === key ? 'bg-white text-gray-900 shadow-sm border border-gray-300' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
