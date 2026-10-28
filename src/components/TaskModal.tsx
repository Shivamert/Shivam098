import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Tag,
  ListTodo,
  Flame,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Bell
} from 'lucide-react';
import {
  TaskDefinition,
  TaskPriority,
  RecurrenceFrequency,
  SubtaskDefinition,
  TaskReminder
} from '../types';
import { formatDate } from '../services/recurrence';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskDefinition | null;
  occurrenceDate?: string;
  categories: string[];
  onSaveTask: (
    taskData: Partial<TaskDefinition>,
    editScope: 'occurrence' | 'future' | 'series',
    targetDate?: string
  ) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  occurrenceDate,
  categories,
  onSaveTask,
}) => {
  const defaultDate = occurrenceDate || formatDate(new Date());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Personal');
  const [tagsInput, setTagsInput] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [color, setColor] = useState('#6366f1');

  // Dates & Times
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');

  // Recurrence
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('none');
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1]); // default Monday
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyWeekNum, setMonthlyWeekNum] = useState(1);
  const [monthlyWeekday, setMonthlyWeekday] = useState(1);
  const [monthEndBehavior, setMonthEndBehavior] = useState<'clamp' | 'skip'>('clamp');
  const [endCondition, setEndCondition] = useState<'never' | 'after_count' | 'on_date'>('never');
  const [endCount, setEndCount] = useState(10);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Activity Repetition Target (e.g. 20 pushups)
  const [hasRepetition, setHasRepetition] = useState(false);
  const [repTarget, setRepTarget] = useState(20);
  const [repUnit, setRepUnit] = useState('reps');

  // Subtasks Checklist
  const [subtasks, setSubtasks] = useState<SubtaskDefinition[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [autoCompleteWhenSubtasksDone, setAutoCompleteWhenSubtasksDone] = useState(true);

  // Reminders
  const [reminders, setReminders] = useState<TaskReminder[]>([
    { id: 'rem_0', minutesBefore: 0 },
  ]);

  // Recurrence Edit Scope Modal prompt
  const [showScopePrompt, setShowScopePrompt] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Partial<TaskDefinition> | null>(null);

  // Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setCategory(taskToEdit.category);
      setTagsInput((taskToEdit.tags || []).join(', '));
      setPriority(taskToEdit.priority);
      setColor(taskToEdit.color || '#6366f1');
      setStartDate(taskToEdit.startDate);
      setEndDate(taskToEdit.endDate || '');
      setScheduledTime(taskToEdit.scheduledTime || '');
      setDueTime(taskToEdit.dueTime || '');
      setDurationMinutes(taskToEdit.durationMinutes || '');

      setFrequency(taskToEdit.recurrence.frequency);
      setInterval(taskToEdit.recurrence.interval || 1);
      setWeekdays(taskToEdit.recurrence.weekdays || [1]);
      setMonthlyDay(taskToEdit.recurrence.monthlyDay || 1);
      setMonthlyWeekNum(taskToEdit.recurrence.monthlyWeekNum || 1);
      setMonthlyWeekday(taskToEdit.recurrence.monthlyWeekday || 1);
      setMonthEndBehavior(taskToEdit.recurrence.monthEndBehavior || 'clamp');
      setEndCondition(taskToEdit.recurrence.endCondition || 'never');
      setEndCount(taskToEdit.recurrence.endCount || 10);
      setRecurrenceEndDate(taskToEdit.recurrence.endDate || '');

      if (taskToEdit.activityRepetition) {
        setHasRepetition(true);
        setRepTarget(taskToEdit.activityRepetition.target);
        setRepUnit(taskToEdit.activityRepetition.unit || 'reps');
      } else {
        setHasRepetition(false);
      }

      setSubtasks(taskToEdit.subtasks || []);
      setAutoCompleteWhenSubtasksDone(!!taskToEdit.autoCompleteWhenSubtasksDone);
      setReminders(taskToEdit.reminders || []);
    } else {
      // New task default
      setStartDate(defaultDate);
      setTitle('');
      setDescription('');
      setCategory(categories[0] || 'Personal');
      setTagsInput('');
      setPriority('normal');
      setFrequency('none');
      setSubtasks([]);
      setHasRepetition(false);
      setReminders([{ id: 'rem_default', minutesBefore: 0 }]);
    }
    setErrorMessage(null);
    setShowScopePrompt(false);
  }, [taskToEdit, defaultDate, categories]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day].sort()
    );
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: newSubtaskTitle.trim(),
        order: prev.length,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddReminder = (mins: number) => {
    if (reminders.some((r) => r.minutesBefore === mins)) return;
    setReminders((prev) => [
      ...prev,
      { id: `rem_${Date.now()}_${mins}`, minutesBefore: mins },
    ]);
  };

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const taskData: Partial<TaskDefinition> = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      tags,
      priority,
      color,
      startDate,
      endDate: endDate || undefined,
      scheduledTime: scheduledTime || undefined,
      dueTime: dueTime || undefined,
      durationMinutes: durationMinutes !== '' ? Number(durationMinutes) : undefined,
      recurrence: {
        frequency,
        interval: Number(interval) || 1,
        weekdays: frequency === 'weekly' ? weekdays : undefined,
        monthlyDay: frequency === 'monthly_date' ? monthlyDay : undefined,
        monthlyWeekNum: frequency === 'monthly_pos' ? monthlyWeekNum : undefined,
        monthlyWeekday: frequency === 'monthly_pos' ? monthlyWeekday : undefined,
        monthEndBehavior,
        endCondition,
        endCount: endCondition === 'after_count' ? Number(endCount) : undefined,
        endDate: endCondition === 'on_date' ? recurrenceEndDate : undefined,
      },
      activityRepetition: hasRepetition
        ? {
            target: Number(repTarget) || 1,
            unit: repUnit.trim() || 'reps',
          }
        : undefined,
      subtasks,
      autoCompleteWhenSubtasksDone,
      reminders,
    };

    // If editing an existing recurring series, prompt scope options!
    if (taskToEdit && taskToEdit.recurrence.frequency !== 'none' && occurrenceDate) {
      setPendingSaveData(taskData);
      setShowScopePrompt(true);
      return;
    }

    onSaveTask(taskData, 'series', occurrenceDate);
    onClose();
  };

  const confirmScope = (scope: 'occurrence' | 'future' | 'series') => {
    if (pendingSaveData) {
      onSaveTask(pendingSaveData, scope, occurrenceDate);
      setShowScopePrompt(false);
      onClose();
    }
  };

  const weekdayLabels = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 0, label: 'Sun' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {taskToEdit ? 'Edit Task or Routine' : 'Create New Task or Routine'}
            </h3>
            <p className="text-xs text-slate-500">
              Configure schedule, repetition target, reminders, and checklist
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics study session, 20 Push-ups, Drink water"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-lg py-1 text-center text-xs font-bold uppercase transition ${
                      priority === p
                        ? p === 'urgent'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : p === 'high'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, steps, or study materials..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Schedule: Date & Times */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Date & Time Scheduling
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Scheduled Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="e.g. 30"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Recurrence Engine Configuration */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                  Recurrence Engine
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Flexible repeat rules
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="none">One-Time (No repetition)</option>
                  <option value="daily">Daily (Every day / N days)</option>
                  <option value="weekly">Weekly (Selected weekdays)</option>
                  <option value="monthly_date">Monthly (By day of month e.g. 15th)</option>
                  <option value="monthly_pos">Monthly (By weekday pattern e.g. 2nd Tue)</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom interval</option>
                </select>
              </div>

              {frequency !== 'none' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Repeat Every
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={interval}
                      onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {frequency === 'daily'
                        ? 'day(s)'
                        : frequency === 'weekly'
                        ? 'week(s)'
                        : frequency === 'monthly_date' || frequency === 'monthly_pos'
                        ? 'month(s)'
                        : 'year(s)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Weekdays Picker */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Repeat on Weekdays (e.g. Mon, Wed, Fri)
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {weekdayLabels.map(({ num, label }) => {
                    const isSelected = weekdays.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => toggleWeekday(num)}
                        className={`h-8 w-11 rounded-lg text-xs font-bold transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Date Config */}
            {frequency === 'monthly_date' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Day of Month (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Month-End Overflow
                  </label>
                  <select
                    value={monthEndBehavior}
                    onChange={(e) => setMonthEndBehavior(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="clamp">Clamp to last day (e.g. Feb 28)</option>
                    <option value="skip">Skip month if day missing</option>
                  </select>
                </div>
              </div>
            )}

            {/* Recurrence End Condition */}
            {frequency !== 'none' && (
              <div className="border-t border-indigo-100 pt-3 dark:border-indigo-950/60">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Series Ending Condition
                </label>
                <div className="mt-1.5 flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="endCond"
                      checked={endCondition === 'never'}
                      onChange={() => setEndCondition('never')}
                      className="text-indigo-600"
                    />
                    <span>Never (Indefinite)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="endCond"
                      checked={endCondition === 'after_count'}
                      onChange={() => setEndCondition('after_count')}
                      className="text-indigo-600"
                    />
                    <span>Stop after N occurrences</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="endCond"
                      checked={endCondition === 'on_date'}
                      onChange={() => setEndCondition('on_date')}
                      className="text-indigo-600"
                    />
                    <span>Stop on date</span>
                  </label>
                </div>

                {endCondition === 'after_count' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-600">Stop after:</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={endCount}
                      onChange={(e) => setEndCount(Math.max(1, Number(e.target.value)))}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="text-xs text-slate-600">occurrences</span>
                  </div>
                )}

                {endCondition === 'on_date' && (
                  <div className="mt-2">
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Repetition Target (Prompt Section 8) */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Numeric Activity Repetition Target
                </h4>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hasRepetition}
                  onChange={(e) => setHasRepetition(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable Target</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-500">
              Set how many times an action is performed during ONE occurrence (e.g. 20 push-ups, 25 pages read).
            </p>

            {hasRepetition && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Target Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={repTarget}
                    onChange={(e) => setRepTarget(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    value={repUnit}
                    onChange={(e) => setRepUnit(e.target.value)}
                    placeholder="e.g. reps, pages, km"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subtasks and Checklist (Prompt Section 10) */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Subtasks & Checklist
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                {subtasks.length} item(s)
              </span>
            </div>

            {/* Subtask input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask item..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5">
              {subtasks.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs dark:bg-slate-800"
                >
                  <span className="text-slate-800 dark:text-slate-200">
                    {idx + 1}. {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={autoCompleteWhenSubtasksDone}
                onChange={(e) => setAutoCompleteWhenSubtasksDone(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Automatically complete task when all subtasks are checked</span>
            </label>
          </div>

          {/* Reminders & Notification Offsets */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Notification Reminders
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { mins: 0, label: 'At scheduled time' },
                { mins: 5, label: '5m before' },
                { mins: 15, label: '15m before' },
                { mins: 30, label: '30m before' },
                { mins: 60, label: '1h before' },
              ].map(({ mins, label }) => {
                const isSelected = reminders.some((r) => r.minutesBefore === mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        const target = reminders.find((r) => r.minutesBefore === mins);
                        if (target) handleRemoveReminder(target.id);
                      } else {
                        handleAddReminder(mins);
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color & Tags */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Accent Color
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                {['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition ${
                      color === c ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="habit, fitness, study"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"
          >
            {taskToEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>

      {/* Recurrence Edit Scope Dialog (Prompt Section 7) */}
      {showScopePrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Recurring Series
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This is a recurring task. How would you like to apply your edits?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => confirmScope('occurrence')}
                className="w-full rounded-xl border border-slate-200 p-3 text-left text-xs font-semibold text-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-950/40"
              >
                <div className="font-bold text-slate-900 dark:text-white">This occurrence only</div>
                <div className="text-[11px] font-normal text-slate-500">
                  Only change the task scheduled for {occurrenceDate}
                </div>
              </button>

              <button
                onClick={() => confirmScope('future')}
                className="w-full rounded-xl border border-slate-200 p-3 text-left text-xs font-semibold text-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-950/40"
              >
                <div className="font-bold text-slate-900 dark:text-white">This and future occurrences</div>
                <div className="text-[11px] font-normal text-slate-500">
                  Update starting from {occurrenceDate} onwards without altering past history
                </div>
              </button>

              <button
                onClick={() => confirmScope('series')}
                className="w-full rounded-xl border border-slate-200 p-3 text-left text-xs font-semibold text-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-950/40"
              >
                <div className="font-bold text-slate-900 dark:text-white">Entire recurring series</div>
                <div className="text-[11px] font-normal text-slate-500">
                  Update the master recurrence definition
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowScopePrompt(false)}
              className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
