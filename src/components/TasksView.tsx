import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Repeat,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Edit,
  Clock,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { TaskDefinition, TaskPriority } from '../types';

interface TasksViewProps {
  tasks: TaskDefinition[];
  onOpenNewTask: () => void;
  onEditTask: (task: TaskDefinition) => void;
  onDuplicateTask: (task: TaskDefinition) => void;
  onToggleArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onOpenNewTask,
  onEditTask,
  onDuplicateTask,
  onToggleArchiveTask,
  onDeleteTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'priority' | 'created'>('created');

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [tasks]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (showArchived ? !t.archived : t.archived) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          const matchTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchTags) return false;
        }

        // Category
        if (selectedCategory !== 'all' && t.category !== selectedCategory) {
          return false;
        }

        // Priority
        if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
          return false;
        }

        // Frequency
        if (selectedFrequency !== 'all') {
          if (selectedFrequency === 'one-time' && t.recurrence.frequency !== 'none') return false;
          if (selectedFrequency === 'recurring' && t.recurrence.frequency === 'none') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'date') {
          return a.startDate.localeCompare(b.startDate);
        }
        if (sortBy === 'priority') {
          const map: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
          return map[a.priority] - map[b.priority];
        }
        return b.createdAt - a.createdAt;
      });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedFrequency, showArchived, sortBy]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            All Tasks & Routines
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredTasks.length} {showArchived ? 'archived' : 'active'} items found
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              showArchived
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {showArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            <span>{showArchived ? 'View Active' : 'View Archived'}</span>
          </button>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or #tag..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Recurrence Filter */}
          <select
            value={selectedFrequency}
            onChange={(e) => setSelectedFrequency(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by frequency"
          >
            <option value="all">All Types</option>
            <option value="recurring">Recurring Routines</option>
            <option value="one-time">One-Time Tasks</option>
          </select>

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Sort tasks"
            >
              <option value="created">Recently Added</option>
              <option value="date">Start Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 sm:flex-row sm:items-center"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {task.title}
                </h3>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  {task.category}
                </span>
                <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  {task.priority}
                </span>
                {task.recurrence.frequency !== 'none' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Repeat className="h-3 w-3" />
                    <span className="capitalize">{task.recurrence.frequency.replace('_', ' ')}</span>
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Start: {task.startDate}</span>
                {task.scheduledTime && (
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Clock className="h-3 w-3" />
                    {task.scheduledTime}
                  </span>
                )}
                {task.activityRepetition && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                    Target: {task.activityRepetition.target} {task.activityRepetition.unit}
                  </span>
                )}
                {task.subtasks.length > 0 && (
                  <span className="text-[11px]">
                    {task.subtasks.length} subtasks
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-1.5 sm:mt-0">
              <button
                onClick={() => onEditTask(task)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Edit task"
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => onDuplicateTask(task)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Duplicate task"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onToggleArchiveTask(task.id)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title={task.archived ? 'Restore' : 'Archive'}
              >
                {task.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="flex items-center gap-1 rounded-lg border border-rose-200 p-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Filter className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No tasks match your criteria
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
