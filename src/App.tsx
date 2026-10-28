/**
 * RoutineFlow - Main Application
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { RoutinesView } from './components/RoutinesView';
import { StatisticsView } from './components/StatisticsView';
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { DailyReviewModal } from './components/DailyReviewModal';
import { TaskDefinition, TaskOccurrence, UserSettings } from './types';
import { StorageService } from './services/storage';
import { formatDate, getOccurrenceId, resolveOccurrence } from './services/recurrence';

export default function App() {
  const [tasks, setTasks] = useState<TaskDefinition[]>(() => StorageService.loadTasks());
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>(() => StorageService.loadOccurrences());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.loadSettings());
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskDefinition | null>(null);
  const [modalOccurrenceDate, setModalOccurrenceDate] = useState<string | undefined>(undefined);
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);

  // Sync state to storage
  const persistTasks = useCallback((newTasks: TaskDefinition[]) => {
    setTasks(newTasks);
    StorageService.saveTasks(newTasks);
  }, []);

  const persistOccurrences = useCallback((newOccurrences: TaskOccurrence[]) => {
    setOccurrences(newOccurrences);
    StorageService.saveOccurrences(newOccurrences);
  }, []);

  const persistSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  }, []);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Periodic reminder checking: sends due reminders to backend Web Push service
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const todayStr = formatDate(new Date());
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        const pendingReminders: any[] = [];
        for (const task of tasks) {
          if (!task.scheduledTime || task.archived || task.recurrence.isPaused) continue;
          const [tH, tM] = task.scheduledTime.split(':').map(Number);
          const taskMins = tH * 60 + tM;
          const nowMins = currentH * 60 + currentM;
          const diff = taskMins - nowMins;

          for (const rem of task.reminders) {
            if (diff === rem.minutesBefore) {
              const occId = getOccurrenceId(task.id, todayStr);
              const occ = resolveOccurrence(task, todayStr, occurrences);
              if (occ.status === 'pending') {
                pendingReminders.push({
                  occurrenceId: occId,
                  reminderId: rem.id,
                  taskId: task.id,
                  taskTitle: task.title,
                  scheduledTime: task.scheduledTime,
                  minutesBefore: rem.minutesBefore,
                });
              }
            }
          }
        }

        if (pendingReminders.length > 0) {
          await fetch('/api/push/process-reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reminders: pendingReminders }),
          });
        }
      } catch (e) {
        // Background reminder check error, ignore safely
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks, occurrences]);

  // Handler: Toggle occurrence completion
  const handleToggleOccurrence = useCallback(
    (occurrenceId: string, taskId: string, date: string, targetStatus?: 'completed' | 'pending') => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const currentOcc = resolveOccurrence(task, date, occurrences);
      const newStatus = targetStatus || (currentOcc.status === 'completed' ? 'pending' : 'completed');

      const updatedOcc: TaskOccurrence = {
        ...currentOcc,
        status: newStatus,
        completedAt: newStatus === 'completed' ? Date.now() : undefined,
      };

      // Also if completing, set activity count to target if configured
      if (newStatus === 'completed' && task.activityRepetition) {
        updatedOcc.activityRepetitionsCompleted = task.activityRepetition.target;
      }

      const filtered = occurrences.filter((o) => o.id !== occurrenceId);
      persistOccurrences([...filtered, updatedOcc]);
    },
    [tasks, occurrences, persistOccurrences]
  );

  // Handler: Activity repetition count (+ / -)
  const handleUpdateOccurrenceActivity = useCallback(
    (occurrenceId: string, taskId: string, date: string, delta: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || !task.activityRepetition) return;

      const currentOcc = resolveOccurrence(task, date, occurrences);
      const currentCount = currentOcc.activityRepetitionsCompleted || 0;
      const target = task.activityRepetition.target;
      const newCount = Math.max(0, currentCount + delta);

      const isFinished = newCount >= target;

      const updatedOcc: TaskOccurrence = {
        ...currentOcc,
        activityRepetitionsCompleted: newCount,
        status: isFinished ? 'completed' : currentOcc.status === 'completed' ? 'pending' : currentOcc.status,
        completedAt: isFinished ? Date.now() : undefined,
      };

      const filtered = occurrences.filter((o) => o.id !== occurrenceId);
      persistOccurrences([...filtered, updatedOcc]);
    },
    [tasks, occurrences, persistOccurrences]
  );

  // Handler: Subtask checkbox toggle
  const handleToggleSubtask = useCallback(
    (occurrenceId: string, taskId: string, date: string, subtaskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const currentOcc = resolveOccurrence(task, date, occurrences);
      const currentMap = currentOcc.subtaskCompletions || {};
      const newMap = { ...currentMap, [subtaskId]: !currentMap[subtaskId] };

      // Auto-complete parent task if enabled and all subtasks done
      let newStatus = currentOcc.status;
      if (task.autoCompleteWhenSubtasksDone && task.subtasks.length > 0) {
        const allDone = task.subtasks.every((s) => newMap[s.id]);
        if (allDone) {
          newStatus = 'completed';
        } else if (newStatus === 'completed') {
          newStatus = 'pending';
        }
      }

      const updatedOcc: TaskOccurrence = {
        ...currentOcc,
        subtaskCompletions: newMap,
        status: newStatus,
        completedAt: newStatus === 'completed' ? Date.now() : undefined,
      };

      const filtered = occurrences.filter((o) => o.id !== occurrenceId);
      persistOccurrences([...filtered, updatedOcc]);
    },
    [tasks, occurrences, persistOccurrences]
  );

  // Handler: Skip occurrence
  const handleSkipOccurrence = useCallback(
    (occurrenceId: string, taskId: string, date: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const currentOcc = resolveOccurrence(task, date, occurrences);
      const nextStatus = currentOcc.status === 'skipped' ? 'pending' : 'skipped';

      const updatedOcc: TaskOccurrence = {
        ...currentOcc,
        status: nextStatus,
      };

      const filtered = occurrences.filter((o) => o.id !== occurrenceId);
      persistOccurrences([...filtered, updatedOcc]);
    },
    [tasks, occurrences, persistOccurrences]
  );

  // Handler: Save Task or Routine (with scope support)
  const handleSaveTask = useCallback(
    (
      taskData: Partial<TaskDefinition>,
      editScope: 'occurrence' | 'future' | 'series',
      targetDate?: string
    ) => {
      if (taskToEdit) {
        if (editScope === 'occurrence' && targetDate) {
          // Occurrence override only
          const occId = getOccurrenceId(taskToEdit.id, targetDate);
          const currentOcc = resolveOccurrence(taskToEdit, targetDate, occurrences);
          const updatedOcc: TaskOccurrence = {
            ...currentOcc,
            overrides: {
              title: taskData.title,
              scheduledTime: taskData.scheduledTime,
              dueTime: taskData.dueTime,
              description: taskData.description,
            },
          };
          const filteredOccs = occurrences.filter((o) => o.id !== occId);
          persistOccurrences([...filteredOccs, updatedOcc]);
        } else if (editScope === 'future' && targetDate) {
          // Set end date on existing task to day before targetDate
          const prevDate = new Date(targetDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const splitOldTask: TaskDefinition = {
            ...taskToEdit,
            endDate: formatDate(prevDate),
            updatedAt: Date.now(),
          };

          // Create new task starting from targetDate
          const newTask: TaskDefinition = {
            ...taskToEdit,
            ...taskData,
            id: `task_${Date.now()}`,
            startDate: targetDate,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as TaskDefinition;

          const updatedTasks = tasks.map((t) => (t.id === taskToEdit.id ? splitOldTask : t));
          persistTasks([...updatedTasks, newTask]);
        } else {
          // Entire series
          const updated = tasks.map((t) =>
            t.id === taskToEdit.id
              ? ({
                  ...t,
                  ...taskData,
                  updatedAt: Date.now(),
                } as TaskDefinition)
              : t
          );
          persistTasks(updated);
        }
      } else {
        // Create new task
        const newTask: TaskDefinition = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: taskData.title || 'Untitled Routine',
          description: taskData.description,
          category: taskData.category || settings.customCategories[0] || 'Personal',
          tags: taskData.tags || [],
          priority: taskData.priority || settings.defaultPriority || 'normal',
          color: taskData.color || '#6366f1',
          startDate: taskData.startDate || selectedDate,
          endDate: taskData.endDate,
          scheduledTime: taskData.scheduledTime,
          dueTime: taskData.dueTime,
          durationMinutes: taskData.durationMinutes,
          reminders: taskData.reminders || [{ id: 'rem_0', minutesBefore: 0 }],
          recurrence: taskData.recurrence || { frequency: 'none', interval: 1, endCondition: 'never' },
          subtasks: taskData.subtasks || [],
          autoCompleteWhenSubtasksDone: taskData.autoCompleteWhenSubtasksDone ?? true,
          activityRepetition: taskData.activityRepetition,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          archived: false,
          userId: 'local_user',
        };
        persistTasks([...tasks, newTask]);
      }
      setTaskToEdit(null);
    },
    [taskToEdit, tasks, occurrences, selectedDate, settings, persistTasks, persistOccurrences]
  );

  // Handler: Delete task occurrence or series
  const handleDeleteOccurrence = useCallback(
    (taskId: string, date: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (task.recurrence.frequency === 'none') {
        // One-time task: delete task completely
        persistTasks(tasks.filter((t) => t.id !== taskId));
        persistOccurrences(occurrences.filter((o) => o.taskId !== taskId));
      } else {
        // Recurring: mark this occurrence as cancelled
        const occId = getOccurrenceId(taskId, date);
        const currentOcc = resolveOccurrence(task, date, occurrences);
        const updatedOcc: TaskOccurrence = {
          ...currentOcc,
          status: 'cancelled',
        };
        persistOccurrences([...occurrences.filter((o) => o.id !== occId), updatedOcc]);
      }
    },
    [tasks, occurrences, persistTasks, persistOccurrences]
  );

  // Handler: Delete entire task
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      if (confirm('Delete this task and all its occurrences?')) {
        persistTasks(tasks.filter((t) => t.id !== taskId));
        persistOccurrences(occurrences.filter((o) => o.taskId !== taskId));
      }
    },
    [tasks, occurrences, persistTasks, persistOccurrences]
  );

  // Handler: Duplicate task
  const handleDuplicateTask = useCallback(
    (task: TaskDefinition) => {
      const cloned: TaskDefinition = {
        ...task,
        id: `task_${Date.now()}_copy`,
        title: `${task.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      persistTasks([...tasks, cloned]);
    },
    [tasks, persistTasks]
  );

  // Handler: Archive/Restore
  const handleToggleArchiveTask = useCallback(
    (taskId: string) => {
      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, archived: !t.archived, updatedAt: Date.now() } : t
      );
      persistTasks(updated);
    },
    [tasks, persistTasks]
  );

  // Handler: Pause/Resume series
  const handleTogglePauseSeries = useCallback(
    (taskId: string) => {
      const updated = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              recurrence: {
                ...t.recurrence,
                isPaused: !t.recurrence.isPaused,
              },
              updatedAt: Date.now(),
            }
          : t
      );
      persistTasks(updated);
    },
    [tasks, persistTasks]
  );

  // Modal open triggers
  const openNewTaskModal = useCallback((initialDate?: string) => {
    setTaskToEdit(null);
    setModalOccurrenceDate(initialDate || selectedDate);
    setIsTaskModalOpen(true);
  }, [selectedDate]);

  const openEditTaskModal = useCallback((task: TaskDefinition, occDate?: string) => {
    setTaskToEdit(task);
    setModalOccurrenceDate(occDate || selectedDate);
    setIsTaskModalOpen(true);
  }, [selectedDate]);

  const handleDataReload = useCallback(() => {
    setTasks(StorageService.loadTasks());
    setOccurrences(StorageService.loadOccurrences());
    setSettings(StorageService.loadSettings());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={persistSettings}
        onOpenDailyReview={() => setIsDailyReviewOpen(true)}
        onOpenNewTask={() => openNewTaskModal()}
      />

      {/* Primary Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewTask={() => openNewTaskModal()}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'home' && (
          <DashboardView
            tasks={tasks}
            occurrences={occurrences}
            settings={settings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onToggleOccurrence={handleToggleOccurrence}
            onUpdateOccurrenceActivity={handleUpdateOccurrenceActivity}
            onToggleSubtask={handleToggleSubtask}
            onSkipOccurrence={handleSkipOccurrence}
            onEditTask={openEditTaskModal}
            onDeleteOccurrence={handleDeleteOccurrence}
            onOpenNewTask={openNewTaskModal}
            onOpenDailyReview={() => setIsDailyReviewOpen(true)}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            occurrences={occurrences}
            settings={settings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onToggleOccurrence={handleToggleOccurrence}
            onOpenNewTask={openNewTaskModal}
            onEditTask={openEditTaskModal}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onOpenNewTask={() => openNewTaskModal()}
            onEditTask={openEditTaskModal}
            onDuplicateTask={handleDuplicateTask}
            onToggleArchiveTask={handleToggleArchiveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentTab === 'routines' && (
          <RoutinesView
            tasks={tasks}
            occurrences={occurrences}
            onOpenNewRoutine={() => openNewTaskModal()}
            onEditTask={openEditTaskModal}
            onTogglePauseSeries={handleTogglePauseSeries}
          />
        )}

        {currentTab === 'stats' && (
          <StatisticsView tasks={tasks} occurrences={occurrences} />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            tasks={tasks}
            occurrences={occurrences}
            onUpdateSettings={persistSettings}
            onDataReload={handleDataReload}
          />
        )}
      </main>

      {/* Task Creation & Editing Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          taskToEdit={taskToEdit}
          occurrenceDate={modalOccurrenceDate}
          categories={settings.customCategories}
          onSaveTask={handleSaveTask}
        />
      )}

      {/* Daily Review & Reflection Modal */}
      {isDailyReviewOpen && (
        <DailyReviewModal
          isOpen={isDailyReviewOpen}
          onClose={() => setIsDailyReviewOpen(false)}
          tasks={tasks}
          occurrences={occurrences}
          selectedDate={selectedDate}
          onToggleOccurrence={handleToggleOccurrence}
          onSkipOccurrence={handleSkipOccurrence}
        />
      )}
    </div>
  );
}
