import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Repeat,
  Calendar as CalendarIcon,
  CheckSquare
} from 'lucide-react';
import { TaskDefinition, TaskOccurrence, UserSettings } from '../types';
import {
  formatDate,
  parseDate,
  addDays,
  isTaskScheduledOnDate,
  resolveOccurrence,
  getDaysInMonth
} from '../services/recurrence';

interface CalendarViewProps {
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  settings: UserSettings;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleOccurrence: (occurrenceId: string, taskId: string, date: string, targetStatus?: 'completed' | 'pending') => void;
  onOpenNewTask: (initialDate?: string) => void;
  onEditTask: (task: TaskDefinition, occurrenceDate?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  occurrences,
  settings,
  selectedDate,
  onSelectDate,
  onToggleOccurrence,
  onOpenNewTask,
  onEditTask,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentMonthDate, setCurrentMonthDate] = useState(() => parseDate(selectedDate));

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // First day of week: 0 for Sunday, 1 for Monday
  const weekStart = settings.weekStartDay ?? 1;

  // Month navigation
  const prevPeriod = () => {
    if (viewMode === 'month') {
      const prev = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
      setCurrentMonthDate(prev);
    } else if (viewMode === 'week') {
      const prevWeek = addDays(parseDate(selectedDate), -7);
      onSelectDate(formatDate(prevWeek));
    } else {
      const prevDay = addDays(parseDate(selectedDate), -1);
      onSelectDate(formatDate(prevDay));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
      setCurrentMonthDate(next);
    } else if (viewMode === 'week') {
      const nextWeek = addDays(parseDate(selectedDate), 7);
      onSelectDate(formatDate(nextWeek));
    } else {
      const nextDay = addDays(parseDate(selectedDate), 1);
      onSelectDate(formatDate(nextDay));
    }
  };

  const jumpToToday = () => {
    setCurrentMonthDate(new Date());
    onSelectDate(todayStr);
  };

  // Month grid matrix
  const monthGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-indexed
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrMonth = getDaysInMonth(year, month + 1);

    // Calculate offset based on weekStart
    let leadDays = (firstDayIndex - weekStart + 7) % 7;
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    const prevMonthDays = getDaysInMonth(year, month === 0 ? 12 : month);
    for (let i = leadDays - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: formatDate(prevDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrMonth; d++) {
      const currDate = new Date(year, month, d);
      days.push({
        dateStr: formatDate(currDate),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: formatDate(nextDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonthDate, weekStart]);

  // Week View Days
  const weekDays = useMemo(() => {
    const curr = parseDate(selectedDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const diffToWeekStart = (dayOfWeek - weekStart + 7) % 7;
    const startOfWeek = addDays(curr, -diffToWeekStart);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(startOfWeek, i);
      const dStr = formatDate(d);
      days.push({
        dateStr: dStr,
        date: d,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        tasks: tasks.filter((t) => isTaskScheduledOnDate(t, dStr)),
      });
    }
    return days;
  }, [selectedDate, weekStart, todayStr, tasks]);

  // Day View Tasks
  const dayViewTasks = useMemo(() => {
    return tasks
      .filter((t) => isTaskScheduledOnDate(t, selectedDate))
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  }, [tasks, selectedDate]);

  const weekdayHeaders = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (weekStart === 1) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
    return days;
  }, [weekStart]);

  return (
    <div className="space-y-6 pb-24">
      {/* Calendar Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {viewMode === 'month'
                ? currentMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                : `Week of ${new Date(parseDate(selectedDate)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected: {selectedDate} {selectedDate === todayStr ? '(Today)' : ''}
            </p>
          </div>
        </div>

        {/* View mode toggle & Navigation arrows */}
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                  viewMode === mode
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={jumpToToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextPeriod}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => onOpenNewTask(selectedDate)}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[11px] font-bold text-slate-500 uppercase py-2 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            {weekdayHeaders.map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
            {monthGrid.map((cell) => {
              const dayTasks = tasks.filter((t) => isTaskScheduledOnDate(t, cell.dateStr));
              const isSelected = cell.dateStr === selectedDate;
              const isTodayCell = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`group relative min-h-[90px] sm:min-h-[110px] p-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      : !cell.isCurrentMonth
                      ? 'bg-slate-50/30 text-slate-400 dark:bg-slate-950/20 dark:text-slate-600'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isTodayCell
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Quick add plus on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewTask(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                      title="Add task on this date"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Task pills inside cell */}
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const occ = resolveOccurrence(task, cell.dateStr, occurrences);
                      const done = occ.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                            done
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 line-through opacity-75'
                              : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: task.color || '#6366f1' }}
                          />
                          <span className="truncate">{task.title}</span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="block text-[9px] font-semibold text-slate-400">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
          {weekDays.map((col) => {
            return (
              <div
                key={col.dateStr}
                className={`rounded-2xl border p-3 transition ${
                  col.isSelected
                    ? 'border-indigo-400 bg-indigo-50/30 dark:border-indigo-700 dark:bg-indigo-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div
                  onClick={() => onSelectDate(col.dateStr)}
                  className="cursor-pointer border-b border-slate-100 pb-2 dark:border-slate-800 text-center"
                >
                  <span className="text-[11px] font-semibold uppercase text-slate-400">
                    {col.date.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <div className="mt-0.5 flex items-center justify-center">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        col.isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {col.date.getDate()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {col.tasks.map((task) => {
                    const occ = resolveOccurrence(task, col.dateStr, occurrences);
                    const done = occ.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-2 text-xs transition ${
                          done
                            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={`font-semibold line-clamp-2 ${done ? 'line-through text-slate-400' : ''}`}
                          >
                            {task.title}
                          </span>
                          <button
                            onClick={() =>
                              onToggleOccurrence(
                                occ.id,
                                task.id,
                                col.dateStr,
                                done ? 'pending' : 'completed'
                              )
                            }
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {done && <CheckCircle2 className="h-3 w-3" />}
                          </button>
                        </div>
                        {task.scheduledTime && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>{task.scheduledTime}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {col.tasks.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-slate-400">
                      No tasks
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Agenda for {selectedDate}
            </h3>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {dayViewTasks.length} tasks scheduled
            </span>
          </div>

          <div className="space-y-3">
            {dayViewTasks.map((task) => {
              const occ = resolveOccurrence(task, selectedDate, occurrences);
              const done = occ.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        onToggleOccurrence(
                          occ.id,
                          task.id,
                          selectedDate,
                          done ? 'pending' : 'completed'
                        )
                      }
                      className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                      }`}
                    >
                      {done && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <div>
                      <h4
                        className={`text-sm font-semibold ${
                          done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        {task.scheduledTime && (
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" />
                            {task.scheduledTime}
                          </span>
                        )}
                        <span>•</span>
                        <span>{task.category}</span>
                        {task.recurrence.frequency !== 'none' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
                              <Repeat className="h-3 w-3" />
                              {task.recurrence.frequency}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onEditTask(task, selectedDate)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                </div>
              );
            })}

            {dayViewTasks.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <CheckSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                No tasks scheduled for this day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
