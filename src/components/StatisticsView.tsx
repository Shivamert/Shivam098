import React, { useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  Calendar,
  PieChart,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { TaskDefinition, TaskOccurrence } from '../types';
import {
  formatDate,
  parseDate,
  addDays,
  calculateDayStats,
  calculateStreak,
  isTaskScheduledOnDate,
  resolveOccurrence
} from '../services/recurrence';

interface StatisticsViewProps {
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  tasks,
  occurrences,
}) => {
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const streak = useMemo(() => calculateStreak(tasks, occurrences, todayStr), [tasks, occurrences, todayStr]);

  // Past 14 days chart data
  const past14Days = useMemo(() => {
    const days = [];
    const today = parseDate(todayStr);
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const dStr = formatDate(d);
      const stats = calculateDayStats(tasks, occurrences, dStr);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      days.push({
        dateStr: dStr,
        dayNum: d.getDate(),
        dayName,
        isToday: dStr === todayStr,
        ...stats,
      });
    }
    return days;
  }, [tasks, occurrences, todayStr]);

  // Overall totals across all recorded occurrences
  const allTimeStats = useMemo(() => {
    let completed = 0;
    let skipped = 0;
    occurrences.forEach((occ) => {
      if (occ.status === 'completed') completed++;
      if (occ.status === 'skipped') skipped++;
    });

    // 7-day average completion rate
    const last7 = past14Days.slice(-7);
    const scheduled7 = last7.reduce((acc, d) => acc + d.totalScheduled, 0);
    const completed7 = last7.reduce((acc, d) => acc + d.completed, 0);
    const weeklyRate = scheduled7 > 0 ? Math.round((completed7 / scheduled7) * 100) : 0;

    return {
      totalCompleted: completed,
      totalSkipped: skipped,
      weeklyRate,
      activeTasksCount: tasks.filter((t) => !t.archived).length,
    };
  }, [occurrences, past14Days, tasks]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    const pastDays = past14Days.map((d) => d.dateStr);

    for (const dStr of pastDays) {
      for (const task of tasks) {
        if (isTaskScheduledOnDate(task, dStr)) {
          const cat = task.category || 'General';
          const entry = map.get(cat) || { total: 0, completed: 0 };
          entry.total++;
          const occ = resolveOccurrence(task, dStr, occurrences);
          if (occ.status === 'completed') {
            entry.completed++;
          }
          map.set(cat, entry);
        }
      }
    }

    return Array.from(map.entries()).map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [past14Days, tasks, occurrences]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Performance & Statistics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Computed from real task occurrences and habits. No arbitrary streaks.
        </p>
      </div>

      {/* Top Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Current Streak */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Current Streak</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/60">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {streak.currentStreak}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Consecutive scheduled days completed
          </p>
        </div>

        {/* Longest Streak */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Best Streak</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {streak.longestStreak}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Personal all-time record
          </p>
        </div>

        {/* 7-Day Completion Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Weekly Success</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/60">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {allTimeStats.weeklyRate}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tasks completed past 7 days
          </p>
        </div>

        {/* All-Time Completed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed All-Time</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-500 dark:bg-purple-950/60">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {allTimeStats.totalCompleted}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Total occurrences finished
          </p>
        </div>
      </div>

      {/* 14-Day Completion History Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              14-Day Completion History
            </h3>
            <p className="text-xs text-slate-500">
              Daily completion rate for each scheduled day
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Past 2 Weeks
          </span>
        </div>

        {/* Bar chart */}
        <div className="grid grid-cols-14 gap-1 sm:gap-2 h-44 items-end pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {past14Days.map((day) => {
            const heightPercent = day.totalScheduled > 0 ? day.completionRate : 0;
            return (
              <div key={day.dateStr} className="flex flex-col items-center h-full justify-end group">
                {/* Tooltip on hover */}
                <span className="opacity-0 group-hover:opacity-100 transition text-[9px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {day.completionRate}%
                </span>
                <div className="w-full max-w-[20px] rounded-t-lg bg-slate-100 dark:bg-slate-800 h-full flex items-end overflow-hidden">
                  <div
                    className={`w-full transition-all duration-500 rounded-t-lg ${
                      day.isToday
                        ? 'bg-indigo-600'
                        : day.completionRate === 100
                        ? 'bg-emerald-500'
                        : day.completionRate > 0
                        ? 'bg-indigo-400'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="mt-2 text-[9px] font-medium text-slate-400">
                  {day.dayNum}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>14 days ago</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 100% Done
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> Today
            </span>
          </div>
          <span>Today</span>
        </div>
      </div>

      {/* Category-Level Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Category Distribution (14 Days)
        </h3>

        <div className="space-y-3">
          {categoryStats.map((cat) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cat.category}
                </span>
                <span className="text-slate-500">
                  {cat.completed} / {cat.total} completed ({cat.rate}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${cat.rate}%` }}
                />
              </div>
            </div>
          ))}

          {categoryStats.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">
              No category history yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
