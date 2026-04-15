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
import { supabase } from '../lib/supabase';

// --- Recurrence helpers (unchanged) ---

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
    if (isBefore(current, rangeStart) && !isSameDay(current, rangeStart)) { count++; continue; }
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
    case 'daily': return addDays(date, interval);
    case 'weekly': return addWeeks(date, interval);
    case 'monthly': return addMonths(date, interval);
    case 'yearly': return addYears(date, interval);
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
    default: return addDays(date, 1);
  }
}

// --- DB row <-> App type mappers ---

function dbEventToApp(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    allDay: row.all_day as boolean,
    color: row.color as string,
    recurrenceRule: row.recurrence_rule as RecurrenceRule | null,
    parentEventId: row.parent_event_id as string | null,
  };
}

// --- Store ---

interface CalendarStore {
  currentDate: Date;
  view: CalendarView;
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;

  events: CalendarEvent[];
  loadEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getExpandedEvents: (rangeStart: Date, rangeEnd: Date) => CalendarEvent[];

  checklists: Record<string, DailyChecklist>;
  loadChecklists: () => Promise<void>;
  getChecklist: (date: string) => DailyChecklist;
  addChecklistItem: (date: string, text: string, eventId?: string) => Promise<void>;
  toggleChecklistItem: (date: string, itemId: string) => Promise<void>;
  deleteChecklistItem: (date: string, itemId: string) => Promise<void>;
  reorderChecklist: (date: string, items: ChecklistItem[]) => Promise<void>;

  diaries: Record<string, WeeklyDiary>;
  loadDiaries: () => Promise<void>;
  getDiary: (weekStart: string) => WeeklyDiary;
  saveDiary: (weekStart: string, content: string) => Promise<void>;
  addDiaryImage: (weekStart: string, image: DiaryImage) => Promise<void>;
  removeDiaryImage: (weekStart: string, imageId: string) => Promise<void>;
  updateDiaryImageCaption: (weekStart: string, imageId: string, caption: string) => Promise<void>;
  updateDiaryImageDate: (weekStart: string, imageId: string, createdAt: string) => Promise<void>;

  notifications: Notification[];
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;

  selectedEvent: CalendarEvent | null;
  isEventModalOpen: boolean;
  isEventModalReadonly: boolean;
  modalDate: string | null;
  modalTime: string | null;
  openEventModal: (date?: string, event?: CalendarEvent, time?: string) => void;
  openEventModalReadonly: (event: CalendarEvent) => void;
  closeEventModal: () => void;

  scrollToEventId: string | null;
  setScrollToEventId: (id: string | null) => void;

  loadAll: () => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  currentDate: new Date(),
  view: 'month',
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),

  // === Events ===
  events: [],

  loadEvents: async () => {
    const { data } = await supabase.from('events').select('*').order('start_at');
    if (data) set({ events: data.map(dbEventToApp) });
  },

  addEvent: async (eventData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('events').insert({
      user_id: user.id,
      title: eventData.title,
      description: eventData.description,
      start_at: eventData.startAt,
      end_at: eventData.endAt,
      all_day: eventData.allDay,
      color: eventData.color,
      recurrence_rule: eventData.recurrenceRule,
      parent_event_id: eventData.parentEventId,
    }).select().single();
    if (!error && data) {
      set({ events: [...get().events, dbEventToApp(data)] });
    }
  },

  updateEvent: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.startAt !== undefined) dbUpdates.start_at = updates.startAt;
    if (updates.endAt !== undefined) dbUpdates.end_at = updates.endAt;
    if (updates.allDay !== undefined) dbUpdates.all_day = updates.allDay;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;

    await supabase.from('events').update(dbUpdates).eq('id', id);
    set({ events: get().events.map((e) => e.id === id ? { ...e, ...updates } : e) });
  },

  deleteEvent: async (id) => {
    await supabase.from('events').delete().eq('id', id);
    set({ events: get().events.filter((e) => e.id !== id && e.parentEventId !== id) });
  },

  getExpandedEvents: (rangeStart, rangeEnd) => {
    const expanded: CalendarEvent[] = [];
    for (const event of get().events) {
      if (event.parentEventId) continue;
      expanded.push(...expandRecurrence(event, rangeStart, rangeEnd));
    }
    return expanded;
  },

  // === Checklists ===
  checklists: {},

  loadChecklists: async () => {
    const { data } = await supabase.from('checklists').select('*');
    if (data) {
      const map: Record<string, DailyChecklist> = {};
      for (const row of data) {
        map[row.date] = { date: row.date, items: (row.items || []) as ChecklistItem[] };
      }
      set({ checklists: map });
    }
  },

  getChecklist: (date) => get().checklists[date] || { date, items: [] },

  addChecklistItem: async (date, text, eventId?) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date] || { date, items: [] };
    checklist.items = [
      ...checklist.items,
      { id: uuidv4(), text, checked: false, order: checklist.items.length, eventId },
    ];
    checklists[date] = checklist;
    set({ checklists });
    await upsertChecklist(date, checklist.items);
  },

  toggleChecklistItem: async (date, itemId) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date];
    if (!checklist) return;
    checklist.items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    checklists[date] = checklist;
    set({ checklists });
    await upsertChecklist(date, checklist.items);
  },

  deleteChecklistItem: async (date, itemId) => {
    const checklists = { ...get().checklists };
    const checklist = checklists[date];
    if (!checklist) return;
    checklist.items = checklist.items.filter((item) => item.id !== itemId);
    checklists[date] = checklist;
    set({ checklists });
    await upsertChecklist(date, checklist.items);
  },

  reorderChecklist: async (date, items) => {
    const checklists = { ...get().checklists };
    checklists[date] = { date, items };
    set({ checklists });
    await upsertChecklist(date, items);
  },

  // === Diary ===
  diaries: {},

  loadDiaries: async () => {
    const { data } = await supabase.from('diaries').select('*');
    if (data) {
      const map: Record<string, WeeklyDiary> = {};
      for (const row of data) {
        map[row.week_start] = {
          weekStart: row.week_start,
          content: row.content || '',
          images: (row.images || []) as DiaryImage[],
          updatedAt: row.updated_at,
        };
      }
      set({ diaries: map });
    }
  },

  getDiary: (weekStart) =>
    get().diaries[weekStart] || { weekStart, content: '', images: [], updatedAt: new Date().toISOString() },

  saveDiary: async (weekStart, content) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    diaries[weekStart] = {
      weekStart, content, images: existing?.images || [], updatedAt: new Date().toISOString(),
    };
    set({ diaries });
    await upsertDiary(weekStart, diaries[weekStart]);
  },

  addDiaryImage: async (weekStart, image) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart] || { weekStart, content: '', images: [], updatedAt: '' };
    diaries[weekStart] = {
      ...existing, images: [...(existing.images || []), image], updatedAt: new Date().toISOString(),
    };
    set({ diaries });
    await upsertDiary(weekStart, diaries[weekStart]);
  },

  removeDiaryImage: async (weekStart, imageId) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).filter((img) =>
      typeof img === 'object' && 'id' in img ? img.id !== imageId : true
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    set({ diaries });
    await upsertDiary(weekStart, diaries[weekStart]);
  },

  updateDiaryImageCaption: async (weekStart, imageId, caption) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).map((img) =>
      typeof img === 'object' && 'id' in img && img.id === imageId ? { ...img, caption } : img
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    set({ diaries });
    await upsertDiary(weekStart, diaries[weekStart]);
  },

  updateDiaryImageDate: async (weekStart, imageId, createdAt) => {
    const diaries = { ...get().diaries };
    const existing = diaries[weekStart];
    if (!existing) return;
    const images = (existing.images || []).map((img) =>
      typeof img === 'object' && 'id' in img && img.id === imageId ? { ...img, createdAt } : img
    );
    diaries[weekStart] = { ...existing, images, updatedAt: new Date().toISOString() };
    set({ diaries });
    await upsertDiary(weekStart, diaries[weekStart]);
  },

  // === Notifications ===
  notifications: [],

  loadNotifications: async () => {
    const { data } = await supabase.from('notifications').select('*').order('time', { ascending: false });
    if (data) {
      set({
        notifications: data.map((n) => ({
          id: n.id, eventId: n.event_id, eventTitle: n.event_title,
          message: n.message, time: n.time, read: n.read,
        })),
      });
    }
  },

  addNotification: (data) => {
    const notification: Notification = { ...data, id: uuidv4() };
    set({ notifications: [notification, ...get().notifications] });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('notifications').insert({
        id: notification.id, user_id: user.id, event_id: data.eventId,
        event_title: data.eventTitle, message: data.message, read: false,
      });
    });
  },

  markNotificationRead: async (id) => {
    set({ notifications: get().notifications.map((n) => n.id === id ? { ...n, read: true } : n) });
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  clearNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('notifications').delete().eq('user_id', user.id);
    set({ notifications: [] });
  },

  // === Modal ===
  selectedEvent: null,
  isEventModalOpen: false,
  isEventModalReadonly: false,
  modalDate: null,
  modalTime: null,

  openEventModal: (date, event, time) => set({
    isEventModalOpen: true, isEventModalReadonly: false,
    modalDate: date || null, modalTime: time || null, selectedEvent: event || null,
  }),

  openEventModalReadonly: (event) => set({
    isEventModalOpen: true, isEventModalReadonly: true,
    modalDate: null, modalTime: null, selectedEvent: event,
  }),

  closeEventModal: () => set({
    isEventModalOpen: false, isEventModalReadonly: false,
    modalDate: null, modalTime: null, selectedEvent: null,
  }),

  scrollToEventId: null,
  setScrollToEventId: (id) => set({ scrollToEventId: id }),

  loadAll: async () => {
    await Promise.all([
      get().loadEvents(),
      get().loadChecklists(),
      get().loadDiaries(),
      get().loadNotifications(),
    ]);
  },
}));

// --- Supabase upsert helpers ---

async function upsertChecklist(date: string, items: ChecklistItem[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('checklists').upsert(
    { user_id: user.id, date, items, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,date' }
  );
}

async function upsertDiary(weekStart: string, diary: WeeklyDiary) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('diaries').upsert(
    {
      user_id: user.id, week_start: weekStart,
      content: diary.content, images: diary.images,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  );
}

// --- Notification scheduler ---

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
      return diff > 0 && diff <= 15 * 60 * 1000;
    });
    for (const event of upcoming) {
      if (store.notifications.some((n) => n.eventId === event.id)) continue;
      const minutesUntil = Math.round((parseISO(event.startAt).getTime() - now.getTime()) / 60000);
      store.addNotification({
        eventId: event.id, eventTitle: event.title,
        message: `"${event.title}" 일정이 ${minutesUntil}분 후 시작됩니다`,
        time: now.toISOString(), read: false,
      });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('nyo DIARY', { body: `"${event.title}" 일정이 ${minutesUntil}분 후 시작됩니다` });
      }
    }
  }, 30000);
}

export function getWeekStart(date: Date): string {
  const ws = startOfWeek(date, { weekStartsOn: 1 });
  return format(ws, 'yyyy-MM-dd');
}
