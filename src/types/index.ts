/**
 * RoutineFlow Data Model & Types
 */

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type OccurrenceStatus = 'pending' | 'completed' | 'skipped' | 'snoozed' | 'cancelled';

export type RecurrenceFrequency =
  | 'none'          // One-time task
  | 'daily'         // Every day or every N days
  | 'weekly'        // Every week or every N weeks, with selected weekdays
  | 'monthly_date'  // Monthly on specific day of month (e.g., 15th)
  | 'monthly_pos'   // Monthly on nth weekday (e.g., 2nd Tuesday)
  | 'yearly'        // Yearly
  | 'custom';       // Custom interval pattern

export type MonthEndBehavior = 'clamp' | 'skip'; // When 31st lands in Feb/Apr/Jun/Sep/Nov

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // >= 1
  weekdays?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  monthlyDay?: number; // 1-31
  monthlyWeekNum?: number; // 1=1st, 2=2nd, 3=3rd, 4=4th, -1=last
  monthlyWeekday?: number; // 0=Sun..6=Sat
  monthEndBehavior?: MonthEndBehavior;
  endCondition: 'never' | 'after_count' | 'on_date';
  endCount?: number;
  endDate?: string; // YYYY-MM-DD
  isPaused?: boolean;
}

export interface ActivityRepetitionConfig {
  target: number; // e.g., 20
  unit?: string;  // e.g., 'reps', 'pages', 'km', 'mins'
}

export interface SubtaskDefinition {
  id: string;
  title: string;
  order: number;
}

export interface TaskReminder {
  id: string;
  minutesBefore: number; // 0 = at event time, 5 = 5 min before, etc.
}

export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  priority: TaskPriority;
  color?: string;
  icon?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  dueTime?: string;       // HH:mm
  durationMinutes?: number;
  reminders: TaskReminder[];
  recurrence: RecurrenceRule;
  subtasks: SubtaskDefinition[];
  autoCompleteWhenSubtasksDone?: boolean;
  activityRepetition?: ActivityRepetitionConfig;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  userId: string;
}

export interface TaskOccurrence {
  id: string; // Format: `${taskId}_${dateStr}`
  taskId: string;
  date: string; // YYYY-MM-DD
  status: OccurrenceStatus;
  completedAt?: number;
  completionNotes?: string;
  activityRepetitionsCompleted?: number;
  subtaskCompletions?: Record<string, boolean>; // subtaskId -> completed
  overrides?: {
    title?: string;
    scheduledTime?: string;
    dueTime?: string;
    description?: string;
  };
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
  timeFormat: '12h' | '24h';
  timezone: string;
  defaultPriority: TaskPriority;
  customCategories: string[];
  defaultReminders: number[];
  pushEnabled: boolean;
  soundEnabled: boolean;
}

export interface DayStats {
  date: string;
  totalScheduled: number;
  completed: number;
  skipped: number;
  pending: number;
  overdue: number;
  completionRate: number; // 0-100
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
}

export interface BackupData {
  version: 1;
  exportedAt: number;
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  settings: UserSettings;
}
