export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startAt: string; // ISO string
  endAt: string;
  allDay: boolean;
  color: string;
  recurrenceRule: RecurrenceRule | null;
  parentEventId: string | null;
  isPrivate: boolean; // 비공개 일정 (공유 안 함)
  // 공유 관련
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  isShared?: boolean; // 다른 사용자의 공유 일정인지
}

export interface CalendarShare {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerName: string;
  sharedWithUsername: string;
  sharedWithId: string | null;
  permission: 'view' | 'edit';
  accepted: boolean;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number; // every N days/weeks/months/years
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ... 6=Sat (for custom weekly)
  endDate?: string; // ISO date string
  count?: number; // repeat N times
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
  eventId?: string; // 연동된 일정 ID (선택)
}

export interface DailyChecklist {
  date: string; // YYYY-MM-DD
  items: ChecklistItem[];
}

export interface DiaryImage {
  id: string;
  data: string; // base64 data URL
  caption: string;
  createdAt: string;
}

export interface WeeklyDiary {
  weekStart: string; // YYYY-MM-DD (Monday)
  content: string;
  images: DiaryImage[];
  updatedAt: string;
}

export interface Notification {
  id: string;
  eventId: string;
  eventTitle: string;
  message: string;
  time: string; // ISO string
  read: boolean;
}

export type CalendarView = 'year' | 'month' | 'week' | 'day';

export const EVENT_COLORS = [
  { name: '파랑', value: '#3b82f6' },
  { name: '빨강', value: '#ef4444' },
  { name: '초록', value: '#22c55e' },
  { name: '노랑', value: '#eab308' },
  { name: '보라', value: '#8b5cf6' },
  { name: '분홍', value: '#ec4899' },
  { name: '주황', value: '#f97316' },
  { name: '청록', value: '#14b8a6' },
];
