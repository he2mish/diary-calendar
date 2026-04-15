import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import YearView from './components/calendar/YearView';
import MonthView from './components/calendar/MonthView';
import WeekView from './components/calendar/WeekView';
import DayView from './components/calendar/DayView';
import EventModal from './components/calendar/EventModal';
import { useCalendarStore, startNotificationScheduler } from './stores/calendarStore';

export default function App() {
  const { view } = useCalendarStore();

  useEffect(() => {
    startNotificationScheduler();
  }, []);

  return (
    <Layout>
      {view === 'year' && <YearView />}
      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}
      <EventModal />
    </Layout>
  );
}
