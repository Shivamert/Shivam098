import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
  Flame,
  CheckSquare,
  Sparkles,
  Undo2,
  Calendar,
  MoreVertical,
  Minus,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Tag,
  Repeat
} from 'lucide-react';
import { TaskDefinition, TaskOccurrence, UserSettings } from '../types';
import {
  formatDate,
  parseDate,
  addDays,
  isTaskScheduledOnDate,
  resolveOccurrence,
  calculateDayStats,
  calculateStreak,
  getOccurrenceId
} from '../services/recurrence';

interface DashboardViewProps {
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  settings: UserSettings;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleOccurrence: (occurrenceId: string, taskId: string, date: string, targetStatus?: 'completed' | 'pending') => void;
  onUpdateOccurrenceActivity: (occurrenceId: string, taskId: string, date: string, delta: number) => void;
  onToggleSubtask: (occurrenceId: string, taskId: string, date: string, subtaskId: string) => void;
  onSkipOccurrence: (occurrenceId: string, taskId: string, date: string) => void;
  onEditTask: (task: TaskDefinition, occurrenceDate?: string) => void;
  onDeleteOccurrence: (taskId: string, date: string) => void;
  onOpenNewTask: (initialDate?: string) => void;
  onOpenDailyReview: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  occurrences,
  settings,
  selectedDate,
  onSelectDate,
  onToggleOccurrence,
  onUpdateOccurrenceActivity,
  onToggleSubtask,
  onSkipOccurrence,
  onEditTask,
  onDeleteOccurrence,
  onOpenNewTask,
  onOpenDailyReview,
}) => {
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const isToday = selectedDate === todayStr;

  // Calculate greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Tasks scheduled on selectedDate
  const scheduledTasks = useMemo(() => {
    return tasks
      .filter((t) => isTaskScheduledOnDate(t, selectedDate))
      .sort((a, b) => {
        // Sort by scheduled time, then priority
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        if (a.scheduledTime) return -1;
        if (b.scheduledTime) return 1;
        const pOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      });
  }, [tasks, selectedDate]);

  // Day Stats
  const dayStats = useMemo(() => {
    return calculateDayStats(tasks, occurrences, selectedDate);
  }, [tasks, occurrences, selectedDate]);

  // Overall Streak
  const streak = useMemo(() => {
    return calculateStreak(tasks, occurrences, todayStr);
  }, [tasks, occurrences, todayStr]);

  // Next upcoming reminder on selectedDate or today
  const nextReminder = useMemo(() => {
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentH}:${currentM}`;

    for (const task of scheduledTasks) {
      const occ = resolveOccurrence(task, selectedDate, occurrences);
      if (occ.status === 'pending' && task.scheduledTime) {
        if (!isToday || task.scheduledTime >= currentTimeStr) {
          return {
            task,
            time: task.scheduledTime,
          };
        }
      }
    }
    return null;
  }, [scheduledTasks, occurrences, selectedDate, isToday]);

  // 7-day scrubber dates around selectedDate
  const weekScrubber = useMemo(() => {
    const baseDate = parseDate(selectedDate);
    const days: { dateStr: string; label: string; dayNum: number; isSelected: boolean; isToday: boolean; stats: any }[] = [];

    for (let i = -3; i <= 3; i++) {
      const d = addDays(baseDate, i);
      const dStr = formatDate(d);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        dateStr: dStr,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isSelected: dStr === selectedDate,
        isToday: dStr === todayStr,
        stats: calculateDayStats(tasks, occurrences, dStr),
      });
    }
    return days;
  }, [selectedDate, todayStr, tasks, occurrences]);

  // Recently completed tasks (across current and past occurrences)
  const recentlyCompleted = useMemo(() => {
    return occurrences
      .filter((o) => o.status === 'completed' && o.completedAt)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 3)
      .map((occ) => {
        const task = tasks.find((t) => t.id === occ.taskId);
        return { occ, task };
      })
      .filter((item): item is { occ: TaskOccurrence; task: TaskDefinition } => item.task !== undefined);
  }, [occurrences, tasks]);

  const toggleSubtasksDrawer = (taskId: string) => {
    setExpandedSubtasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'high':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner: Greeting, Date & Navigation */}
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(parseDate(selectedDate)).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {isToday && (
              <span className="rounded-full bg-indigo-500/40 px-2 py-0.5 text-[10px] text-white">
                Today
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greeting}, ready for your day?
          </h1>
          <p className="mt-1 text-xs text-indigo-200/90 sm:text-sm">
            {dayStats.completed} of {dayStats.totalScheduled} tasks completed ({dayStats.completionRate}%)
          </p>
        </div>

        {/* Date switcher controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onSelectDate(formatDate(addDays(parseDate(selectedDate), -1)))}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            title="Previous day"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {!isToday && (
            <button
              onClick={() => onSelectDate(todayStr)}
              className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
            >
              Today
            </button>
          )}
          <button
            onClick={() => onSelectDate(formatDate(addDays(parseDate(selectedDate), 1)))}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            title="Next day"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 7-Day Interactive Overview Scrubber */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekScrubber.map((day) => {
            const hasTasks = day.stats.totalScheduled > 0;
            const isAllDone = hasTasks && day.stats.completed === day.stats.totalScheduled;
            return (
              <button
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className={`flex flex-col items-center justify-center rounded-xl p-2 transition ${
                  day.isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-label={`Select date ${day.dateStr}`}
              >
                <span className="text-[10px] font-semibold uppercase">{day.label}</span>
                <span className={`text-base font-bold ${day.isToday && !day.isSelected ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                  {day.dayNum}
                </span>
                {/* Mini progress dot */}
                <div className="mt-1 flex h-1.5 w-full max-w-[28px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {hasTasks ? (
                    <div
                      className={`h-full ${
                        day.isSelected
                          ? 'bg-white'
                          : isAllDone
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${day.stats.completionRate}%` }}
                    />
                  ) : (
                    <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Completion Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {dayStats.completionRate}%
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${dayStats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Remaining & Pending */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Remaining</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {dayStats.pending}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {dayStats.completed} completed today
          </p>
        </div>

        {/* Overdue / Skipped */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue / Skipped</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {dayStats.overdue + dayStats.skipped}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {dayStats.overdue} overdue, {dayStats.skipped} skipped
          </p>
        </div>

        {/* Habit Streak */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Habit Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {streak.currentStreak} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Best: {streak.longestStreak} days
          </p>
        </div>
      </div>

      {/* Next Reminder Alert Badge if present */}
      {nextReminder && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Next Upcoming Task
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {nextReminder.task.title}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            {nextReminder.time}
          </div>
        </div>
      )}

      {/* Today's Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Scheduled Tasks ({scheduledTasks.length})
          </h2>
          <button
            onClick={() => onOpenNewTask(selectedDate)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>

        {scheduledTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <CheckSquare className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              No tasks scheduled for this day
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Enjoy your free time, or schedule a routine to build momentum.
            </p>
            <button
              onClick={() => onOpenNewTask(selectedDate)}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Add Task for this Day
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledTasks.map((task) => {
              const occ = resolveOccurrence(task, selectedDate, occurrences);
              const isCompleted = occ.status === 'completed';
              const isSkipped = occ.status === 'skipped';
              const isOverdue = selectedDate < todayStr && !isCompleted && !isSkipped;

              const hasSubtasks = task.subtasks && task.subtasks.length > 0;
              const completedSubtasksCount = hasSubtasks
                ? task.subtasks.filter((s) => occ.subtaskCompletions?.[s.id]).length
                : 0;

              const hasRepetition = task.activityRepetition && task.activityRepetition.target > 0;
              const repCount = occ.activityRepetitionsCompleted || 0;
              const repTarget = task.activityRepetition?.target || 1;

              return (
                <div
                  key={occ.id}
                  className={`group relative rounded-2xl border transition-all ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-950/40 dark:bg-emerald-950/10 opacity-80'
                      : isSkipped
                      ? 'border-slate-200 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-60'
                      : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 shadow-xs'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() =>
                          onToggleOccurrence(
                            occ.id,
                            task.id,
                            selectedDate,
                            isCompleted ? 'pending' : 'completed'
                          )
                        }
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                          isCompleted
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                            : 'border-slate-300 bg-white hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-800'
                        }`}
                        title={isCompleted ? 'Mark pending' : 'Mark completed'}
                        aria-label={`Toggle completion for ${task.title}`}
                      >
                        {isCompleted && <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />}
                      </button>

                      {/* Main Task Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm font-semibold text-slate-900 dark:text-white ${
                              isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {task.title}
                          </h3>

                          {/* Priority badge */}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getPriorityBadgeClass(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>

                          {/* Recurrence Indicator */}
                          {task.recurrence.frequency !== 'none' && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                              <Repeat className="h-3 w-3" />
                              <span className="capitalize">{task.recurrence.frequency.replace('_', ' ')}</span>
                            </span>
                          )}

                          {isSkipped && (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Skipped
                            </span>
                          )}
                          {isOverdue && (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                              Overdue
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Meta Info: Time, Category, Tags */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {task.scheduledTime && (
                            <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Clock className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{task.scheduledTime}</span>
                              {task.durationMinutes && (
                                <span className="text-[11px] text-slate-400">
                                  ({task.durationMinutes}m)
                                </span>
                              )}
                            </div>
                          )}

                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {task.category}
                          </span>

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-slate-400" />
                              <span className="text-[11px]">{task.tags.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Activity Repetition Counter (e.g. 20 pushups) */}
                        {hasRepetition && (
                          <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Activity Target:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onUpdateOccurrenceActivity(occ.id, task.id, selectedDate, -1)}
                                disabled={repCount <= 0}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                aria-label="Decrement repetition count"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-[4rem] text-center text-xs font-bold text-slate-900 dark:text-white">
                                {repCount} / {repTarget} {task.activityRepetition?.unit || 'reps'}
                              </span>
                              <button
                                onClick={() => onUpdateOccurrenceActivity(occ.id, task.id, selectedDate, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                aria-label="Increment repetition count"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="ml-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {Math.round((repCount / repTarget) * 100)}%
                            </div>
                          </div>
                        )}

                        {/* Subtasks Progress Bar & Toggle Button */}
                        {hasSubtasks && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleSubtasksDrawer(task.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                              aria-expanded={!!expandedSubtasks[task.id]}
                            >
                              <ListTodo className="h-3.5 w-3.5" />
                              <span>
                                Checklist ({completedSubtasksCount}/{task.subtasks.length})
                              </span>
                              {expandedSubtasks[task.id] ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* Subtask list */}
                            {expandedSubtasks[task.id] && (
                              <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                                {task.subtasks.map((sub) => {
                                  const subDone = !!occ.subtaskCompletions?.[sub.id];
                                  return (
                                    <label
                                      key={sub.id}
                                      className="flex items-center gap-2 cursor-pointer text-xs"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={subDone}
                                        onChange={() =>
                                          onToggleSubtask(occ.id, task.id, selectedDate, sub.id)
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span
                                        className={`${
                                          subDone
                                            ? 'line-through text-slate-400 dark:text-slate-500'
                                            : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                      >
                                        {sub.title}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Menu (Skip, Edit, Delete) */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                          aria-label="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuTaskId === task.id && (
                          <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                            <button
                              onClick={() => {
                                onEditTask(task, selectedDate);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Edit Task / Series
                            </button>
                            <button
                              onClick={() => {
                                onSkipOccurrence(occ.id, task.id, selectedDate);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {isSkipped ? 'Unskip' : 'Skip this date'}
                            </button>
                            <button
                              onClick={() => {
                                onDeleteOccurrence(task.id, selectedDate);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Completed Section with instant Undo */}
      {recentlyCompleted.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recently Completed
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {recentlyCompleted.map(({ occ, task }) => (
              <div
                key={occ.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-200 line-through">
                    {task.title}
                  </span>
                  <span className="text-[10px] text-slate-400">({occ.date})</span>
                </div>
                <button
                  onClick={() =>
                    onToggleOccurrence(occ.id, task.id, occ.date, 'pending')
                  }
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                  title="Undo completion"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Undo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
