import React, { useMemo } from 'react';
import {
  Repeat,
  Play,
  Pause,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Edit,
  Flame,
  AlertCircle
} from 'lucide-react';
import { TaskDefinition, TaskOccurrence } from '../types';

interface RoutinesViewProps {
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  onOpenNewRoutine: () => void;
  onEditTask: (task: TaskDefinition) => void;
  onTogglePauseSeries: (taskId: string) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  tasks,
  occurrences,
  onOpenNewRoutine,
  onEditTask,
  onTogglePauseSeries,
}) => {
  // Only recurring tasks (frequency !== 'none')
  const recurringTasks = useMemo(() => {
    return tasks.filter((t) => t.recurrence.frequency !== 'none' && !t.archived);
  }, [tasks]);

  const describeRecurrence = (task: TaskDefinition) => {
    const { frequency, interval, weekdays, monthlyDay, monthlyWeekNum, monthlyWeekday, endCondition, endCount } = task.recurrence;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let freqDesc = '';
    if (frequency === 'daily') {
      freqDesc = interval === 1 ? 'Every day' : `Every ${interval} days`;
    } else if (frequency === 'weekly') {
      const daysStr = weekdays && weekdays.length > 0
        ? weekdays.map((d) => dayNames[d]).join(', ')
        : 'Weekly';
      freqDesc = interval === 1 ? `Every week on ${daysStr}` : `Every ${interval} weeks on ${daysStr}`;
    } else if (frequency === 'monthly_date') {
      freqDesc = `Monthly on the ${monthlyDay || 1}th`;
    } else if (frequency === 'monthly_pos') {
      const posStr = monthlyWeekNum === -1 ? 'last' : `${monthlyWeekNum}th`;
      const wName = monthlyWeekday !== undefined ? dayNames[monthlyWeekday] : 'day';
      freqDesc = `Monthly on the ${posStr} ${wName}`;
    } else if (frequency === 'yearly') {
      freqDesc = 'Yearly';
    } else {
      freqDesc = `Custom (every ${interval} units)`;
    }

    if (endCondition === 'after_count' && endCount) {
      freqDesc += ` • Stops after ${endCount} occurrences`;
    }

    return freqDesc;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Routines & Habit Series
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage automated recurrence rules, pause/resume series, and track ongoing habits
          </p>
        </div>

        <button
          onClick={onOpenNewRoutine}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Routine</span>
        </button>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {recurringTasks.map((task) => {
          const isPaused = !!task.recurrence.isPaused;
          const taskOccurrences = occurrences.filter((o) => o.taskId === task.id);
          const completedCount = taskOccurrences.filter((o) => o.status === 'completed').length;

          return (
            <div
              key={task.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                isPaused
                  ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 opacity-75'
                  : 'border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: task.color || '#6366f1' }}
                    >
                      <Repeat className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </h3>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                        {task.category}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isPaused
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                    }`}
                  >
                    {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>

                {task.description && (
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Recurrence Rule Card */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <Repeat className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{describeRecurrence(task)}</span>
                  </div>
                  {task.scheduledTime && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Scheduled at {task.scheduledTime}</span>
                    </div>
                  )}
                  {task.activityRepetition && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      <span>Target: {task.activityRepetition.target} {task.activityRepetition.unit}</span>
                    </div>
                  )}
                </div>

                {/* Completion counter */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{completedCount} occurrences completed</span>
                  </div>
                  <span>Started {task.startDate}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => onTogglePauseSeries(task.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isPaused
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span>{isPaused ? 'Resume Series' : 'Pause Series'}</span>
                </button>

                <button
                  onClick={() => onEditTask(task)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Series</span>
                </button>
              </div>
            </div>
          );
        })}

        {recurringTasks.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Repeat className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Recurring Routines Configured
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set up daily habits, weekly workouts, or study schedules to automate your day.
            </p>
            <button
              onClick={onOpenNewRoutine}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              Create First Routine
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
