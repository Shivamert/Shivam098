import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTaskScheduledOnDate,
  getOccurrenceId,
  getOccurrencesForDateRange,
  resolveOccurrence,
  calculateStreak,
  getNthWeekdayOfMonth,
  getDaysInMonth,
  formatDate,
  parseDate,
  addDays
} from './recurrence.js';
import { TaskDefinition, TaskOccurrence } from '../types/index.js';

function createMockTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task_1',
    title: 'Test Task',
    category: 'general',
    tags: [],
    priority: 'normal',
    startDate: '2026-10-01',
    reminders: [],
    subtasks: [],
    recurrence: {
      frequency: 'none',
      interval: 1,
      endCondition: 'never',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: false,
    userId: 'user_1',
    ...overrides,
  };
}

test('1. One-time task: scheduled on start date, not on following days', () => {
  const task = createMockTask({
    startDate: '2026-10-15',
    recurrence: { frequency: 'none', interval: 1, endCondition: 'never' },
  });

  assert.equal(isTaskScheduledOnDate(task, '2026-10-15'), true);
  assert.equal(isTaskScheduledOnDate(task, '2026-10-16'), false);
  assert.equal(isTaskScheduledOnDate(task, '2026-10-22'), false);
});

test('2. Daily recurrence: appears every day indefinitely', () => {
  const task = createMockTask({
    startDate: '2026-10-01',
    recurrence: { frequency: 'daily', interval: 1, endCondition: 'never' },
  });

  assert.equal(isTaskScheduledOnDate(task, '2026-10-01'), true);
  assert.equal(isTaskScheduledOnDate(task, '2026-10-02'), true);
  assert.equal(isTaskScheduledOnDate(task, '2026-10-15'), true);
  assert.equal(isTaskScheduledOnDate(task, '2026-09-30'), false); // before start
});

test('3. Example A: Seven distinct weekday tasks appear on their respective weekdays', () => {
  // Monday = 1, Tuesday = 2, ..., Sunday = 0
  const weekdayTasks: TaskDefinition[] = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) =>
    createMockTask({
      id: `task_day_${dayIndex}`,
      title: `Routine Day ${dayIndex}`,
      startDate: '2026-10-01',
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        weekdays: [dayIndex],
        endCondition: 'never',
      },
    })
  );

  // 2026-10-05 is a Monday (1)
  const monDate = '2026-10-05';
  const monTask = weekdayTasks.find((t) => isTaskScheduledOnDate(t, monDate));
  assert.ok(monTask);
  assert.equal(monTask?.id, 'task_day_1');

  // Verify only 1 task is scheduled on Monday out of the seven
  const scheduledOnMon = weekdayTasks.filter((t) => isTaskScheduledOnDate(t, monDate));
  assert.equal(scheduledOnMon.length, 1);

  // 2026-10-11 is a Sunday (0)
  const sunDate = '2026-10-11';
  const sunTask = weekdayTasks.find((t) => isTaskScheduledOnDate(t, sunDate));
  assert.equal(sunTask?.id, 'task_day_0');
});

test('4. Example B: Mathematics study task for Monday, Wednesday, Friday at 7 PM', () => {
  const mathTask = createMockTask({
    id: 'math_task',
    title: 'Mathematics Study',
    startDate: '2026-10-01', // Thursday
    scheduledTime: '19:00',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [1, 3, 5], // Mon, Wed, Fri
      endCondition: 'never',
    },
  });

  // Thursday 2026-10-01: not Mon, Wed, Fri
  assert.equal(isTaskScheduledOnDate(mathTask, '2026-10-01'), false);
  // Friday 2026-10-02 (5): yes
  assert.equal(isTaskScheduledOnDate(mathTask, '2026-10-02'), true);
  // Saturday 2026-10-03 (6): no
  assert.equal(isTaskScheduledOnDate(mathTask, '2026-10-03'), false);
  // Monday 2026-10-05 (1): yes
  assert.equal(isTaskScheduledOnDate(mathTask, '2026-10-05'), true);
  // Wednesday 2026-10-07 (3): yes
  assert.equal(isTaskScheduledOnDate(mathTask, '2026-10-07'), true);
});

test('5. Example C: Repeats every 2 weeks and stops after 3 occurrences', () => {
  const biweeklyTask = createMockTask({
    id: 'biweekly_task',
    startDate: '2026-10-01',
    recurrence: {
      frequency: 'weekly',
      interval: 2,
      weekdays: [parseDate('2026-10-01').getDay()], // Thursday
      endCondition: 'after_count',
      endCount: 3,
    },
  });

  // Occurrence 1: 2026-10-01
  assert.equal(isTaskScheduledOnDate(biweeklyTask, '2026-10-01'), true);
  // 1 week later (2026-10-08): skipped because interval is 2
  assert.equal(isTaskScheduledOnDate(biweeklyTask, '2026-10-08'), false);
  // Occurrence 2: 2026-10-15
  assert.equal(isTaskScheduledOnDate(biweeklyTask, '2026-10-15'), true);
  // Occurrence 3: 2026-10-29
  assert.equal(isTaskScheduledOnDate(biweeklyTask, '2026-10-29'), true);
  // Occurrence 4 (2026-11-12): must be stopped (exceeds count of 3)
  assert.equal(isTaskScheduledOnDate(biweeklyTask, '2026-11-12'), false);
});

test('6. Independent occurrence completion: completing today does not affect next week', () => {
  const task = createMockTask({
    id: 'gym_habit',
    startDate: '2026-10-01',
    recurrence: { frequency: 'daily', interval: 1, endCondition: 'never' },
  });

  const occurrences: TaskOccurrence[] = [
    {
      id: getOccurrenceId('gym_habit', '2026-10-01'),
      taskId: 'gym_habit',
      date: '2026-10-01',
      status: 'completed',
      completedAt: Date.now(),
    },
  ];

  // Today's occurrence is completed
  const occToday = resolveOccurrence(task, '2026-10-01', occurrences);
  assert.equal(occToday.status, 'completed');

  // Tomorrow's occurrence is pending and independent
  const occTomorrow = resolveOccurrence(task, '2026-10-02', occurrences);
  assert.equal(occTomorrow.status, 'pending');
  assert.equal(occTomorrow.id, 'gym_habit_2026-10-02');
});

test('7. Month-end clamp behavior: 31st of month clamps correctly in February', () => {
  const monthlyTask = createMockTask({
    id: 'bill_pay',
    startDate: '2026-01-31',
    recurrence: {
      frequency: 'monthly_date',
      interval: 1,
      monthlyDay: 31,
      monthEndBehavior: 'clamp',
      endCondition: 'never',
    },
  });

  // Jan 31: yes
  assert.equal(isTaskScheduledOnDate(monthlyTask, '2026-01-31'), true);
  // Feb 2026 has 28 days: clamps to Feb 28
  assert.equal(isTaskScheduledOnDate(monthlyTask, '2026-02-28'), true);
  // Feb 27: no
  assert.equal(isTaskScheduledOnDate(monthlyTask, '2026-02-27'), false);
  // Mar 31: yes
  assert.equal(isTaskScheduledOnDate(monthlyTask, '2026-03-31'), true);
  // Apr has 30 days: clamps to Apr 30
  assert.equal(isTaskScheduledOnDate(monthlyTask, '2026-04-30'), true);
});

test('8. Monthly by weekday pattern: 2nd Tuesday of the month', () => {
  // Let's test 2nd Tuesday in Oct 2026
  // Oct 1 = Thursday, 1st Tuesday = Oct 6, 2nd Tuesday = Oct 13
  const secondTuesdayDay = getNthWeekdayOfMonth(2026, 10, 2, 2);
  assert.equal(secondTuesdayDay, 13);

  const patternTask = createMockTask({
    startDate: '2026-10-01',
    recurrence: {
      frequency: 'monthly_pos',
      interval: 1,
      monthlyWeekNum: 2,
      monthlyWeekday: 2, // Tuesday
      endCondition: 'never',
    },
  });

  assert.equal(isTaskScheduledOnDate(patternTask, '2026-10-13'), true);
  assert.equal(isTaskScheduledOnDate(patternTask, '2026-10-06'), false);
  assert.equal(isTaskScheduledOnDate(patternTask, '2026-10-20'), false);
});

test('9. Paused recurring series does not produce occurrences', () => {
  const pausedTask = createMockTask({
    startDate: '2026-10-01',
    recurrence: {
      frequency: 'daily',
      interval: 1,
      endCondition: 'never',
      isPaused: true,
    },
  });

  assert.equal(isTaskScheduledOnDate(pausedTask, '2026-10-01'), false);
  assert.equal(isTaskScheduledOnDate(pausedTask, '2026-10-02'), false);
});

test('10. Streak calculation: a day without scheduled tasks does not break streak', () => {
  // Task scheduled on Mon, Wed, Fri
  const task = createMockTask({
    id: 'workout',
    startDate: '2026-10-01',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [1, 3, 5],
      endCondition: 'never',
    },
  });

  // Say Mon Oct 12 and Wed Oct 14 were completed.
  // Tue Oct 13 had NO tasks scheduled.
  const occurrences: TaskOccurrence[] = [
    {
      id: getOccurrenceId('workout', '2026-10-12'),
      taskId: 'workout',
      date: '2026-10-12',
      status: 'completed',
    },
    {
      id: getOccurrenceId('workout', '2026-10-14'),
      taskId: 'workout',
      date: '2026-10-14',
      status: 'completed',
    },
  ];

  // When evaluating streak on 2026-10-14, the streak is maintained across the unscheduled Tuesday!
  const streak = calculateStreak([task], occurrences, '2026-10-14');
  assert.equal(streak.currentStreak, 2);
});
