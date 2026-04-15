import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import YearView from './components/calendar/YearView';
import MonthView from './components/calendar/MonthView';
import WeekView from './components/calendar/WeekView';
import DayView from './components/calendar/DayView';
import EventModal from './components/calendar/EventModal';
import EventSummary from './components/calendar/EventSummary';
import AuthPage from './components/auth/AuthPage';
import { useCalendarStore, startNotificationScheduler } from './stores/calendarStore';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const { view } = useCalendarStore();
  const { user, loading, initialize } = useAuthStore();
  const loadAll = useCalendarStore((s) => s.loadAll);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (user) {
      loadAll();
      startNotificationScheduler();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      {view === 'year' && <YearView />}
      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}
      <EventModal />
      <EventSummary />
    </Layout>
  );
}
