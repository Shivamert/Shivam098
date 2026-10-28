import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Flame
} from 'lucide-react';
import { TaskDefinition, TaskOccurrence } from '../types';
import {
  formatDate,
  calculateDayStats,
  resolveOccurrence,
  isTaskScheduledOnDate
} from '../services/recurrence';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  selectedDate: string;
  onToggleOccurrence: (occurrenceId: string, taskId: string, date: string, targetStatus?: 'completed' | 'pending') => void;
  onSkipOccurrence: (occurrenceId: string, taskId: string, date: string) => void;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
  occurrences,
  selectedDate,
  onToggleOccurrence,
  onSkipOccurrence,
}) => {
  if (!isOpen) return null;

  const stats = calculateDayStats(tasks, occurrences, selectedDate);
  const scheduledTasks = tasks.filter((t) => isTaskScheduledOnDate(t, selectedDate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Planning & Review
              </h3>
              <p className="text-xs text-slate-500">
                Reflection for {selectedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Celebration / Summary card */}
        <div className="rounded-2xl bg-gradient-to-tr from-indigo-900 to-indigo-800 p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-200">Completion Status</span>
            <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
              {stats.completionRate}%
            </span>
          </div>
          <p className="mt-2 text-lg font-bold">
            {stats.completed === stats.totalScheduled && stats.totalScheduled > 0
              ? '🎉 Outstanding work! All routines completed!'
              : stats.completed > 0
              ? `Solid progress: ${stats.completed} tasks checked off!`
              : 'Take a breath and review your plan.'}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-indigo-200">
            <span>✓ {stats.completed} done</span>
            <span>• {stats.pending} remaining</span>
            <span>• {stats.skipped} skipped</span>
          </div>
        </div>

        {/* Remaining tasks quick-check */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tasks for this Day ({scheduledTasks.length})
          </span>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {scheduledTasks.map((task) => {
              const occ = resolveOccurrence(task, selectedDate, occurrences);
              const done = occ.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onToggleOccurrence(
                          occ.id,
                          task.id,
                          selectedDate,
                          done ? 'pending' : 'completed'
                        )
                      }
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                      }`}
                    >
                      {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                    <span className={`font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {task.title}
                    </span>
                  </div>
                  {!done && (
                    <button
                      onClick={() => onSkipOccurrence(occ.id, task.id, selectedDate)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                    >
                      Skip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
        >
          Done Reviewing
        </button>
      </div>
    </div>
  );
};
