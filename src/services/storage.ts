/**
 * RoutineFlow Storage and Persistence Service
 * Local-first storage with offline queue, import/export, and cloud synchronization readiness.
 */

import { TaskDefinition, TaskOccurrence, UserSettings, BackupData } from '../types';
import { formatDate } from './recurrence';

const TASKS_KEY = 'routineflow_tasks_v1';
const OCCURRENCES_KEY = 'routineflow_occurrences_v1';
const SETTINGS_KEY = 'routineflow_settings_v1';
const SYNC_QUEUE_KEY = 'routineflow_sync_queue_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  weekStartDay: 1, // Monday
  timeFormat: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  defaultPriority: 'normal',
  customCategories: ['Morning', 'Evening', 'Work', 'Health & Fitness', 'Learning', 'Personal', 'Finance'],
  defaultReminders: [0, 15],
  pushEnabled: false,
  soundEnabled: true,
};

// Realistic initial demo seed data
export function getInitialSeedTasks(): TaskDefinition[] {
  const today = formatDate(new Date());

  return [
    {
      id: 'task_morning_routine',
      title: 'Morning Awakening & Hydration',
      description: 'Drink 500ml of water with lemon, 5 mins light stretches, and open blinds.',
      category: 'Morning',
      tags: ['wellness', 'habit'],
      priority: 'high',
      color: '#06b6d4',
      icon: 'Sun',
      startDate: today,
      scheduledTime: '07:00',
      durationMinutes: 20,
      reminders: [{ id: 'rem_1', minutesBefore: 0 }],
      recurrence: {
        frequency: 'daily',
        interval: 1,
        endCondition: 'never',
      },
      subtasks: [
        { id: 'sub_1', title: 'Drink 500ml water', order: 0 },
        { id: 'sub_2', title: '5-minute full body stretch', order: 1 },
        { id: 'sub_3', title: 'Open windows for sunlight', order: 2 },
      ],
      autoCompleteWhenSubtasksDone: true,
      activityRepetition: {
        target: 1,
        unit: 'session',
      },
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now(),
      archived: false,
      userId: 'local_user',
    },
    {
      id: 'task_pushups',
      title: 'Strength Core: 30 Push-ups',
      description: 'Perform push-ups in controlled sets of 10 throughout the day.',
      category: 'Health & Fitness',
      tags: ['fitness', 'strength'],
      priority: 'normal',
      color: '#10b981',
      icon: 'Flame',
      startDate: today,
      scheduledTime: '08:30',
      durationMinutes: 15,
      reminders: [{ id: 'rem_2', minutesBefore: 15 }],
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        weekdays: [1, 2, 3, 4, 5], // Weekdays
        endCondition: 'never',
      },
      subtasks: [],
      activityRepetition: {
        target: 30,
        unit: 'reps',
      },
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now(),
      archived: false,
      userId: 'local_user',
    },
    {
      id: 'task_math_study',
      title: 'Advanced Mathematics & Algorithms Study',
      description: 'Review linear algebra and graph theory problem sets.',
      category: 'Learning',
      tags: ['study', 'math', 'career'],
      priority: 'high',
      color: '#6366f1',
      icon: 'BookOpen',
      startDate: today,
      scheduledTime: '19:00',
      dueTime: '20:30',
      durationMinutes: 90,
      reminders: [
        { id: 'rem_3', minutesBefore: 15 },
        { id: 'rem_4', minutesBefore: 0 },
      ],
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        weekdays: [1, 3, 5], // Mon, Wed, Fri (Prompt Example B)
        endCondition: 'never',
      },
      subtasks: [
        { id: 'sub_m1', title: 'Complete Chapter 4 problem set', order: 0 },
        { id: 'sub_m2', title: 'Write summary flashcards', order: 1 },
      ],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      archived: false,
      userId: 'local_user',
    },
    {
      id: 'task_weekly_review',
      title: 'Weekly RoutineFlow Review & Planning',
      description: 'Audit tasks completed this week, adjust goals, and plan upcoming schedule.',
      category: 'Personal',
      tags: ['planning', 'reflection'],
      priority: 'urgent',
      color: '#f59e0b',
      icon: 'Calendar',
      startDate: today,
      scheduledTime: '18:00',
      durationMinutes: 30,
      reminders: [{ id: 'rem_5', minutesBefore: 30 }],
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        weekdays: [0], // Sundays
        endCondition: 'never',
      },
      subtasks: [
        { id: 'sub_w1', title: 'Clear completed tasks inbox', order: 0 },
        { id: 'sub_w2', title: 'Check habit streaks & statistics', order: 1 },
        { id: 'sub_w3', title: 'Export JSON cloud backup', order: 2 },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      userId: 'local_user',
    },
    {
      id: 'task_reading',
      title: 'Read 25 Pages of Non-Fiction',
      description: 'Dedicated screen-free evening reading session before bedtime.',
      category: 'Learning',
      tags: ['books', 'calm'],
      priority: 'low',
      color: '#8b5cf6',
      icon: 'Bookmark',
      startDate: today,
      scheduledTime: '21:30',
      durationMinutes: 45,
      reminders: [{ id: 'rem_6', minutesBefore: 10 }],
      recurrence: {
        frequency: 'daily',
        interval: 1,
        endCondition: 'never',
      },
      subtasks: [],
      activityRepetition: {
        target: 25,
        unit: 'pages',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      userId: 'local_user',
    },
  ];
}

export class StorageService {
  /**
   * Load tasks from local storage
   */
  static loadTasks(): TaskDefinition[] {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      if (!data) {
        const seed = getInitialSeedTasks();
        this.saveTasks(seed);
        return seed;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
      return getInitialSeedTasks();
    }
  }

  /**
   * Save tasks to local storage
   */
  static saveTasks(tasks: TaskDefinition[]): void {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      this.enqueueSync({ type: 'tasks', timestamp: Date.now() });
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }

  /**
   * Load occurrences from local storage
   */
  static loadOccurrences(): TaskOccurrence[] {
    try {
      const data = localStorage.getItem(OCCURRENCES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load occurrences', e);
      return [];
    }
  }

  /**
   * Save occurrences to local storage
   */
  static saveOccurrences(occurrences: TaskOccurrence[]): void {
    try {
      localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(occurrences));
      this.enqueueSync({ type: 'occurrences', timestamp: Date.now() });
    } catch (e) {
      console.error('Failed to save occurrences', e);
    }
  }

  /**
   * Load user settings
   */
  static loadSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save user settings
   */
  static saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  /**
   * Offline sync queue helper
   */
  static enqueueSync(action: any): void {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(action);
      // Keep last 100 items
      if (queue.length > 100) queue.shift();
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      // Ignore sync queue error
    }
  }

  /**
   * Export all data as JSON
   */
  static exportBackup(): BackupData {
    return {
      version: 1,
      exportedAt: Date.now(),
      tasks: this.loadTasks(),
      occurrences: this.loadOccurrences(),
      settings: this.loadSettings(),
    };
  }

  /**
   * Validate and import JSON backup
   */
  static importBackup(
    backup: any,
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; importedCount: number; message: string } {
    if (!backup || typeof backup !== 'object' || !Array.isArray(backup.tasks)) {
      return { success: false, importedCount: 0, message: 'Invalid backup format. Expected tasks array.' };
    }

    try {
      let finalTasks: TaskDefinition[] = [];
      let finalOccurrences: TaskOccurrence[] = [];

      if (mode === 'replace') {
        finalTasks = backup.tasks;
        finalOccurrences = Array.isArray(backup.occurrences) ? backup.occurrences : [];
      } else {
        // Merge: keep newer updatedAt
        const currentTasks = this.loadTasks();
        const currentOccurrences = this.loadOccurrences();

        const taskMap = new Map<string, TaskDefinition>();
        currentTasks.forEach((t) => taskMap.set(t.id, t));
        backup.tasks.forEach((t: TaskDefinition) => {
          const existing = taskMap.get(t.id);
          if (!existing || (t.updatedAt && t.updatedAt > (existing.updatedAt || 0))) {
            taskMap.set(t.id, t);
          }
        });
        finalTasks = Array.from(taskMap.values());

        const occMap = new Map<string, TaskOccurrence>();
        currentOccurrences.forEach((o) => occMap.set(o.id, o));
        if (Array.isArray(backup.occurrences)) {
          backup.occurrences.forEach((o: TaskOccurrence) => {
            occMap.set(o.id, o);
          });
        }
        finalOccurrences = Array.from(occMap.values());
      }

      this.saveTasks(finalTasks);
      this.saveOccurrences(finalOccurrences);

      if (backup.settings) {
        this.saveSettings({ ...this.loadSettings(), ...backup.settings });
      }

      return {
        success: true,
        importedCount: backup.tasks.length,
        message: `Successfully imported ${backup.tasks.length} tasks!`,
      };
    } catch (e: any) {
      return { success: false, importedCount: 0, message: e.message || 'Failed to process import.' };
    }
  }

  /**
   * Export tasks as CSV string
   */
  static exportTasksAsCSV(tasks: TaskDefinition[]): string {
    const headers = ['Title', 'Category', 'Priority', 'Start Date', 'Scheduled Time', 'Recurrence', 'Tags', 'Archived'];
    const rows = tasks.map((t) => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      `"${t.priority}"`,
      `"${t.startDate}"`,
      `"${t.scheduledTime || ''}"`,
      `"${t.recurrence.frequency}"`,
      `"${(t.tags || []).join(';')}"`,
      t.archived ? 'true' : 'false',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Clear all stored local data
   */
  static resetAllData(): void {
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(OCCURRENCES_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }
}
