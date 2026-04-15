import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CalendarEvent,
  CalendarView,
  DailyChecklist,
  ChecklistItem,
  WeeklyDiary,
  DiaryImage,
  Notification,
  RecurrenceRule,
} from '../types';
import {
  startOfWeek,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  isBefore,
  parseISO,
  isSameDay,
} from 'date-fns';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function expandRecurrence(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!event.recurrenceRule) return [event];

  const rule = event.recurrenceRule;
  const results: CalendarEvent[] = [event];
  const baseStart = parseISO(event.startAt);
  const baseEnd = parseISO(event.endAt);
  const duration = baseEnd.getTime() - baseStart.getTime();

  let current = baseStart;
  let count = 1;
  const maxIterations = 365;

  for (let i = 0; i < maxIterations; i++) {
    current = getNextOccurrence(current, rule);
    if (isBefore(rangeEnd, current)) break;
    if (rule.endDate && isBefore(parseISO(rule.endDate), current)) break;
    if (rule.count && count >= rule.count) break;

    if (isBefore(current, rangeStart) && !isSameDay(current, rangeStart)) {
      count++;
      continue;
    }

    const newEnd = new Date(current.getTime() + duration);
    results.push({
      ...event,
      id: `${event.id}_${format(current, 'yyyy-MM-dd')}`,
      startAt: current.toISOString(),
      endAt: newEnd.toISOString(),
      parentEventId: event.id,
    });
    count++;
  }

  return results;
}

function getNextOccurrence(date: Date, rule: RecurrenceRule): Date {
  const interval = rule.interval || 1;
  switch (rule.type) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'monthly':
      return addMonths(date, interval);
    case 'yearly':
      return addYears(date, interval);
    case 'custom':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        let next = addDays(date, 1);
        for (let i = 0; i < 7; i++) {
          if (rule.daysOfWeek.includes(next.getDay())) return next;
          next = addDays(next, 1);
        }
        return addDays(date, 7);
      }
      return addDays(date, interval);
    default:
      return addDays(date, 1);
  }
}

interface CalendarStore {
  // View state
  currentDate: Date;
  view: CalendarView;
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;

  // Events
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getExpandedEvents: (rangeStart: Date, rangeEnd: Date) => CalendarEvent[];

  // Checklists
  checklists: Record<string, DailyChecklist>;
  getChecklist: (date: string) => DailyChecklist;
  addChecklistItem: (date: string, text: string, eventId?: string) => void;
  toggleChecklistItem: (date: string, itemId: string) => void;
  deleteChecklistItem: (date: string, itemId: string) => void;
  reorderChecklist: (date: string, items: ChecklistItem[]) => void;

  // Diary
  diaries: Record<string, WeeklyDiary>;
  getDiary: (weekStart: string) => WeeklyDiary;
  saveDiary: (weekStart: string, content: string) => void;
  addDiaryImage: (weekStart: string, image: DiaryImage) => void;
  removeDiaryImage: (weekStart: string, imageId: string) => void;
  updateDiaryImageCaption: (weekStart: string, imageId: string, caption: string) => void;
  updateDiaryImageDate: (weekStart: string, imageId: string, createdAt: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Modal
  selectedEvent: CalendarEvent | null;
  isEventModalOpen: boolean;
  isEventModalReadonly: boolean;
  modalDate: string | null;
  modalTime: string | null;
  openEventModal: (date?: string, event?: CalendarEvent, time?: string) => void;
  openEventModalReadonly: (event: CalendarEvent) => void;
  closeEventModal: () => void;

  // Scroll to event
  scrollToEventId: string | null;
  setScrollToEventId: (id: string | null) => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  currentDate: new Date(),
  view: 'month',
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),

  // Events
  events: loadFromStorage<CalendarEvent[]>('diary-cal-events', []),

  addEvent: (eventData) => {
    const event: CalendarEvent = { ...eventData, id: uuidv4() };
    const events = [...get().events, event];
    saveToStorage('diary-cal-events', events);
    set({ events });
  },

  updateEvent: (id, data) => {
    const events = get().events.map((e) =>
      e.id === id ? { ...e, ...data } : e
    );
    saveToStorage('diary-cal-events', events);
    set({ events });
  },

  deleteEvent: (id) => {
    const events = get().events.filter((e) => e.id !== id && e.parentEventId !== id);
    saveToStorage('diary-cal-events', events);
    set({ events });
  },

  getExpandedEvents: (rangeStart, rangeEnd) => {
    const events = get().events;
    const expanded: CalendarEvent[] = [];
    for (const event of events) {
      if (event.parentEventId) continue; // skip individual overrides, handled by expandRecurrence
      expanded.push(...expandRecurrence(event, rangeStart, rangeEnd));
    }
    return expanded;
  },

  // Checklists
  checklists: loadFromStorage<Record<string, DailyChecklist>>('diary-cal-checklists', {}),

  getChecklist: (date) => {
    return get().checklists[date] || { date, items: [] };
  },

  addChecklistItem: (date, text, eventId?) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date] || { date, items: [] };
    checklist.items = [
      ...checklist.items,
      { id: uuidv4(), text, checked: false, order: checklist.items.length, eventId },
    ];
    checklists[date] = checklist;
    saveToStorage('diary-cal-checklists', checklists);
    set({ checklists });
  },

  toggleChecklistItem: (date, itemId) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date];
    if (!checklist) return;
    checklist.items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    checklists[date] = checklist;
    saveToStorage('diary-cal-checklists', checklists);
    set({ checklists });
  },

  deleteChecklistItem: (date, itemId) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date];
    if (!checklist) return;
    checklist.items = checklist.items.filter((item) => item.id !== itemId);
    checklists[date] = checklist;
    saveToStorage('diary-cal-checklists', checklists);
    set({ checklists });
  },

  reorderChecklist: (date, items) => {
    const checklists = { ...get().checklists };
    checklists[date] = { date, items };
    saveToStorage('diary-cal-checklists', checklists);
    set({ checklists });
  },

  // Diary
  diaries: loadFromStorage<Record<string, WeeklyDiary>>('diary-cal-diaries', {}),

  getDiary: (weekStart) => {
    return (
      get().diaries[weekStart] || {
        weekStart,
        content: '',
        images: [],
        updatedAt: new Date().toISOString(),
      }
    );
  },

  saveDiary: (weekStart, content) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    diaries[weekStart] = {
      weekStart,
      content,
      images: existing?.images || [],
      updatedAt: new Date().toISOString(),
    };
    saveToStorage('diary-cal-diaries', diaries);
    set({ diaries });
  },

  addDiaryImage: (weekStart, image) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart] || { weekStart, content: '', images: [], updatedAt: '' };
    diaries[weekStart] = {
      ...existing,
      images: [...(existing.images || []), image],
      updatedAt: new Date().toISOString(),
    };
    saveToStorage('diary-cal-diaries', diaries);
    set({ diaries });
  },

  removeDiaryImage: (weekStart, imageId) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).filter((img) =>
      typeof img === 'object' && 'id' in img ? img.id !== imageId : true
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    saveToStorage('diary-cal-diaries', diaries);
    set({ diaries });
  },

  updateDiaryImageCaption: (weekStart, imageId, caption) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).map((img) =>
      typeof img === 'object' && 'id' in img && img.id === imageId
        ? { ...img, caption }
        : img
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    saveToStorage('diary-cal-diaries', diaries);
    set({ diaries });
  },

  updateDiaryImageDate: (weekStart, imageId, createdAt) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).map((img) =>
      typeof img === 'object' && 'id' in img && img.id === imageId
        ? { ...img, createdAt }
        : img
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    saveToStorage('diary-cal-diaries', diaries);
    set({ diaries });
  },

  // Notifications
  notifications: loadFromStorage<Notification[]>('diary-cal-notifications', []),

  addNotification: (data) => {
    const notification: Notification = { ...data, id: uuidv4() };
    const notifications = [notification, ...get().notifications];
    saveToStorage('diary-cal-notifications', notifications);
    set({ notifications });
  },

  markNotificationRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveToStorage('diary-cal-notifications', notifications);
    set({ notifications });
  },

  clearNotifications: () => {
    saveToStorage('diary-cal-notifications', []);
    set({ notifications: [] });
  },

  // Modal
  selectedEvent: null,
  isEventModalOpen: false,
  isEventModalReadonly: false,
  modalDate: null,
  modalTime: null,

  openEventModal: (date, event, time) => {
    set({
      isEventModalOpen: true,
      isEventModalReadonly: false,
      modalDate: date || null,
      modalTime: time || null,
      selectedEvent: event || null,
    });
  },

  openEventModalReadonly: (event) => {
    set({
      isEventModalOpen: true,
      isEventModalReadonly: true,
      modalDate: null,
      modalTime: null,
      selectedEvent: event,
    });
  },

  closeEventModal: () => {
    set({
      isEventModalOpen: false,
      isEventModalReadonly: false,
      modalDate: null,
      modalTime: null,
      selectedEvent: null,
    });
  },

  // Scroll to event
  scrollToEventId: null,
  setScrollToEventId: (id) => set({ scrollToEventId: id }),
}));

// Notification scheduler
let notificationInterval: ReturnType<typeof setInterval> | null = null;

export function startNotificationScheduler() {
  if (notificationInterval) return;

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  notificationInterval = setInterval(() => {
    const store = useCalendarStore.getState();
    const now = new Date();
    const upcoming = store.events.filter((event) => {
      const eventTime = parseISO(event.startAt);
      const diff = eventTime.getTime() - now.getTime();
      return diff > 0 && diff <= 15 * 60 * 1000; // 15 minutes
    });

    for (const event of upcoming) {
      const alreadyNotified = store.notifications.some(
        (n) => n.eventId === event.id
      );
      if (alreadyNotified) continue;

      const minutesUntil = Math.round(
        (parseISO(event.startAt).getTime() - now.getTime()) / 60000
      );

      store.addNotification({
        eventId: event.id,
        eventTitle: event.title,
        message: `"${event.title}" 일정이 ${minutesUntil}분 후 시작됩니다`,
        time: now.toISOString(),
        read: false,
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Diary Calendar', {
          body: `"${event.title}" 일정이 ${minutesUntil}분 후 시작됩니다`,
        });
      }
    }
  }, 30000); // check every 30 seconds
}

export function getWeekStart(date: Date): string {
  const ws = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return format(ws, 'yyyy-MM-dd');
}
