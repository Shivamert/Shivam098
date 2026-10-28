/**
 * RoutineFlow Recurrence Engine
 * Deterministic occurrence generation, scheduling rules, month-end handling,
 * and streak/statistics calculation.
 */

import { TaskDefinition, TaskOccurrence, DayStats, StreakInfo } from '../types';

/**
 * Format Date object to YYYY-MM-DD local string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD local string into a Date at local midnight
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get number of days in a given year and month (1-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate stable, deterministic occurrence ID
 */
export function getOccurrenceId(taskId: string, dateStr: string): string {
  return `${taskId}_${dateStr}`;
}

/**
 * Calculate the difference in calendar days between two dates (date2 - date1)
 */
export function diffInDays(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Get nth weekday of month (e.g. 2nd Tuesday)
 * weekNum: 1, 2, 3, 4, or -1 (for last weekday)
 * weekday: 0 = Sun..6 = Sat
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekNum: number, weekday: number): number {
  const totalDays = getDaysInMonth(year, month);
  if (weekNum === -1) {
    // Last occurrence
    for (let day = totalDays; day >= 1; day--) {
      const d = new Date(year, month - 1, day);
      if (d.getDay() === weekday) return day;
    }
    return totalDays;
  }

  let count = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === weekday) {
      count++;
      if (count === weekNum) return day;
    }
  }
  return -1;
}

/**
 * Counts how many occurrences happened strictly before targetDateStr
 * Used to enforce `endCondition === 'after_count'`.
 */
export function countOccurrencesBefore(task: TaskDefinition, targetDateStr: string): number {
  const start = parseDate(task.startDate);
  const target = parseDate(targetDateStr);
  if (target <= start) return 0;

  let count = 0;
  let curr = new Date(start.getTime());

  // Limit loop to safe bounds (up to 1000 occurrences or 10 years)
  while (curr < target && count < 2000) {
    const dStr = formatDate(curr);
    if (isTaskScheduledOnDateInternal(task, dStr, false)) {
      count++;
    }
    curr = addDays(curr, 1);
  }

  return count;
}

/**
 * Core internal check: is task scheduled on a given local date string?
 */
function isTaskScheduledOnDateInternal(
  task: TaskDefinition,
  dateStr: string,
  checkCountLimit: boolean = true
): boolean {
  if (task.archived) return false;
  if (task.recurrence.isPaused) return false;

  const targetDate = parseDate(dateStr);
  const startDate = parseDate(task.startDate);

  // Before task start date: never scheduled
  if (targetDate < startDate) {
    return false;
  }

  // Check end date condition
  if (task.endDate && targetDate > parseDate(task.endDate)) {
    return false;
  }
  if (task.recurrence.endCondition === 'on_date' && task.recurrence.endDate) {
    if (targetDate > parseDate(task.recurrence.endDate)) {
      return false;
    }
  }

  const { frequency, interval = 1 } = task.recurrence;

  // 1. One-time task
  if (frequency === 'none') {
    return dateStr === task.startDate;
  }

  // Check occurrence count limit if enabled
  if (checkCountLimit && task.recurrence.endCondition === 'after_count' && task.recurrence.endCount) {
    const countBefore = countOccurrencesBefore(task, dateStr);
    if (countBefore >= task.recurrence.endCount) {
      return false;
    }
  }

  const dayDifference = diffInDays(startDate, targetDate);

  // 2. Daily or Every N days
  if (frequency === 'daily') {
    return dayDifference >= 0 && dayDifference % interval === 0;
  }

  // 3. Weekly or Selected weekdays
  if (frequency === 'weekly') {
    const targetDayOfWeek = targetDate.getDay();
    const activeWeekdays = task.recurrence.weekdays && task.recurrence.weekdays.length > 0
      ? task.recurrence.weekdays
      : [startDate.getDay()];

    if (!activeWeekdays.includes(targetDayOfWeek)) {
      return false;
    }

    if (interval === 1) {
      return true;
    }

    // Interval > 1: check week interval from startDate
    // Calculate start of week difference
    const startWeekDay = startDate.getDay();
    const diffWeeks = Math.floor((dayDifference + startWeekDay) / 7);
    return diffWeeks >= 0 && diffWeeks % interval === 0;
  }

  // 4. Monthly by Date (e.g., on the 15th, or 31st)
  if (frequency === 'monthly_date') {
    const targetDay = task.recurrence.monthlyDay ?? startDate.getDate();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const daysInMonth = getDaysInMonth(targetYear, targetMonth);

    // Month-end handling: if target day is 31 and month has 30, clamp or skip
    const behavior = task.recurrence.monthEndBehavior || 'clamp';
    const effectiveDay = behavior === 'clamp'
      ? Math.min(targetDay, daysInMonth)
      : targetDay;

    if (targetDate.getDate() !== effectiveDay) {
      return false;
    }

    // Interval checking (e.g. every 2 months)
    const monthDiff = (targetYear - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return monthDiff >= 0 && monthDiff % interval === 0;
  }

  // 5. Monthly by Weekday Position (e.g. 2nd Tuesday of the month)
  if (frequency === 'monthly_pos') {
    const weekNum = task.recurrence.monthlyWeekNum ?? 1;
    const weekday = task.recurrence.monthlyWeekday ?? startDate.getDay();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    const nthDay = getNthWeekdayOfMonth(targetYear, targetMonth, weekNum, weekday);
    if (targetDate.getDate() !== nthDay) {
      return false;
    }

    const monthDiff = (targetYear - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return monthDiff >= 0 && monthDiff % interval === 0;
  }

  // 6. Yearly
  if (frequency === 'yearly') {
    const isSameMonthAndDay =
      targetDate.getMonth() === startDate.getMonth() &&
      targetDate.getDate() === startDate.getDate();
    
    // Leap year handling: Feb 29
    if (!isSameMonthAndDay && startDate.getMonth() === 1 && startDate.getDate() === 29) {
      if (targetDate.getMonth() === 1 && targetDate.getDate() === 28 && !isLeapYear(targetDate.getFullYear())) {
        return true;
      }
    }

    const yearDiff = targetDate.getFullYear() - startDate.getFullYear();
    return isSameMonthAndDay && yearDiff >= 0 && yearDiff % interval === 0;
  }

  // 7. Custom interval
  if (frequency === 'custom') {
    return dayDifference >= 0 && dayDifference % interval === 0;
  }

  return false;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Public export to check if a task is scheduled on dateStr
 */
export function isTaskScheduledOnDate(task: TaskDefinition, dateStr: string): boolean {
  return isTaskScheduledOnDateInternal(task, dateStr, true);
}

/**
 * Generate all occurrences dates for a task within a date range [startStr, endStr]
 */
export function getOccurrencesForDateRange(
  task: TaskDefinition,
  startStr: string,
  endStr: string
): string[] {
  const result: string[] = [];
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  let curr = new Date(start.getTime());
  while (curr <= end) {
    const dStr = formatDate(curr);
    if (isTaskScheduledOnDate(task, dStr)) {
      result.push(dStr);
    }
    curr = addDays(curr, 1);
  }

  return result;
}

/**
 * Get or synthesize occurrence object for a task and date
 */
export function resolveOccurrence(
  task: TaskDefinition,
  dateStr: string,
  existingOccurrences: TaskOccurrence[]
): TaskOccurrence {
  const occId = getOccurrenceId(task.id, dateStr);
  const found = existingOccurrences.find((o) => o.id === occId);
  if (found) {
    return found;
  }

  return {
    id: occId,
    taskId: task.id,
    date: dateStr,
    status: 'pending',
    activityRepetitionsCompleted: 0,
    subtaskCompletions: {},
  };
}

/**
 * Calculate Day statistics for a specific date
 */
export function calculateDayStats(
  tasks: TaskDefinition[],
  occurrences: TaskOccurrence[],
  dateStr: string
): DayStats {
  const scheduledTasks = tasks.filter((t) => isTaskScheduledOnDate(t, dateStr));
  let completed = 0;
  let skipped = 0;
  let pending = 0;
  let overdue = 0;

  const todayStr = formatDate(new Date());
  const isPast = dateStr < todayStr;

  for (const task of scheduledTasks) {
    const occ = resolveOccurrence(task, dateStr, occurrences);
    if (occ.status === 'completed') {
      completed++;
    } else if (occ.status === 'skipped' || occ.status === 'cancelled') {
      skipped++;
    } else {
      if (isPast) {
        overdue++;
      } else {
        pending++;
      }
    }
  }

  const total = scheduledTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    date: dateStr,
    totalScheduled: total,
    completed,
    skipped,
    pending,
    overdue,
    completionRate,
  };
}

/**
 * Calculate streak based on scheduled task occurrences.
 * A day with no scheduled tasks does not break a streak.
 * Skipped tasks do not count as completed.
 */
export function calculateStreak(
  tasks: TaskDefinition[],
  occurrences: TaskOccurrence[],
  todayStr: string = formatDate(new Date())
): StreakInfo {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastCompletedDate: string | undefined;

  // Scan past 365 days backward from today
  const today = parseDate(todayStr);
  let streakActive = true;

  for (let i = 0; i < 365; i++) {
    const checkDate = addDays(today, -i);
    const dStr = formatDate(checkDate);

    const scheduled = tasks.filter((t) => isTaskScheduledOnDate(t, dStr));
    if (scheduled.length === 0) {
      // No tasks scheduled on this day: does NOT break current streak!
      continue;
    }

    const completedCount = scheduled.filter((task) => {
      const occ = resolveOccurrence(task, dStr, occurrences);
      return occ.status === 'completed';
    }).length;

    const allCompleted = completedCount > 0 && completedCount === scheduled.length;

    if (i === 0 && !allCompleted) {
      // Today is still in progress; check if at least one completed or pending
      // Doesn't immediately break streak if it's the current ongoing day
      continue;
    }

    if (allCompleted) {
      if (!lastCompletedDate) {
        lastCompletedDate = dStr;
      }
      if (streakActive) {
        currentStreak++;
      }
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      streakActive = false;
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, longestStreak),
    lastCompletedDate,
  };
}
