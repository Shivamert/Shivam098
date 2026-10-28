import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Laptop,
  Bell,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import { UserSettings, TaskDefinition, TaskOccurrence } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';

interface SettingsViewProps {
  settings: UserSettings;
  tasks: TaskDefinition[];
  occurrences: TaskOccurrence[];
  onUpdateSettings: (settings: UserSettings) => void;
  onDataReload: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  tasks,
  occurrences,
  onUpdateSettings,
  onDataReload,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [pushStatus, setPushStatus] = useState<string>('checking');
  const [activeServerSubs, setActiveServerSubs] = useState<number | null>(null);
  const [isProcessingPush, setIsProcessingPush] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Import preview state
  const [importPreview, setImportPreview] = useState<{
    backup: any;
    taskCount: number;
    occurrenceCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  useEffect(() => {
    refreshPushStatus();
  }, []);

  const refreshPushStatus = async () => {
    const st = NotificationService.getStatus();
    setPushStatus(st.permission);

    try {
      const res = await fetch('/api/push/status');
      if (res.ok) {
        const data = await res.json();
        setActiveServerSubs(data.activeSubscriptions);
      }
    } catch (e) {
      // Backend status call failed (offline)
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubscribePush = async () => {
    setIsProcessingPush(true);
    const res = await NotificationService.subscribeToPush();
    setIsProcessingPush(false);
    if (res.success) {
      setPushStatus('granted');
      onUpdateSettings({ ...settings, pushEnabled: true });
      showFeedback(res.message, 'success');
      refreshPushStatus();
    } else {
      showFeedback(res.message, 'error');
    }
  };

  const handleSendTestPush = async () => {
    setIsProcessingPush(true);
    const res = await NotificationService.sendTestPush();
    setIsProcessingPush(false);
    showFeedback(res.message, res.success ? 'success' : 'error');
    refreshPushStatus();
  };

  const handleUnsubscribePush = async () => {
    setIsProcessingPush(true);
    const res = await NotificationService.unsubscribe();
    setIsProcessingPush(false);
    if (res.success) {
      onUpdateSettings({ ...settings, pushEnabled: false });
      showFeedback(res.message, 'success');
      refreshPushStatus();
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (settings.customCategories.includes(newCategory.trim())) {
      showFeedback('Category already exists', 'error');
      return;
    }
    const updated = [...settings.customCategories, newCategory.trim()];
    onUpdateSettings({ ...settings, customCategories: updated });
    setNewCategory('');
    showFeedback('Category added', 'success');
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = settings.customCategories.filter((c) => c !== cat);
    onUpdateSettings({ ...settings, customCategories: updated });
    showFeedback(`Removed category "${cat}"`, 'success');
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backup = StorageService.exportBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `RoutineFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showFeedback('Backup exported successfully!', 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = StorageService.exportTasksAsCSV(tasks);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `RoutineFlow_Tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showFeedback('Tasks exported to CSV!', 'success');
  };

  // Handle File Input for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || !Array.isArray(json.tasks)) {
          showFeedback('Invalid file format. Expected a RoutineFlow JSON backup.', 'error');
          return;
        }
        setImportPreview({
          backup: json,
          taskCount: json.tasks.length,
          occurrenceCount: Array.isArray(json.occurrences) ? json.occurrences.length : 0,
        });
      } catch (err) {
        showFeedback('Could not parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Import
  const executeImport = () => {
    if (!importPreview) return;
    const res = StorageService.importBackup(importPreview.backup, importMode);
    if (res.success) {
      showFeedback(res.message, 'success');
      setImportPreview(null);
      onDataReload();
    } else {
      showFeedback(res.message, 'error');
    }
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all tasks and occurrences? This action cannot be undone.')) {
      StorageService.resetAllData();
      onDataReload();
      showFeedback('All local data was reset.', 'success');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Application Settings & Cloud Sync
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Preferences, Web Push reminders, data backup & restore, and Android widget bridge
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* General Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          General Preferences
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Theme Mode
            </label>
            <div className="mt-1.5 flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdateSettings({ ...settings, theme: t })}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium capitalize transition ${
                    settings.theme === t
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'system' && <Laptop className="h-3.5 w-3.5" />}
                  {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                  {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Week Start Day */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              First Day of the Week
            </label>
            <select
              value={settings.weekStartDay}
              onChange={(e) =>
                onUpdateSettings({ ...settings, weekStartDay: Number(e.target.value) as 0 | 1 })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={1}>Monday (Standard)</option>
              <option value={0}>Sunday</option>
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) =>
                onUpdateSettings({ ...settings, timeFormat: e.target.value as '12h' | '24h' })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="12h">12-Hour (e.g. 7:00 PM)</option>
              <option value="24h">24-Hour (e.g. 19:00)</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Timezone
            </label>
            <input
              type="text"
              value={settings.timezone}
              onChange={(e) => onUpdateSettings({ ...settings, timezone: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Real Server-Backed Web Push Notifications */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Web Push & Server Reminders
              </h3>
              <p className="text-xs text-slate-500">
                Encrypted VAPID Web Push delivery to browser and device notification shade
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              pushStatus === 'granted'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {pushStatus === 'granted' ? 'Active' : 'Not Subscribed'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Browser Permission:
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {pushStatus}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Server Subscriptions:
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {activeServerSubs !== null ? `${activeServerSubs} registered endpoint(s)` : 'Connecting...'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pushStatus !== 'granted' ? (
            <button
              onClick={handleSubscribePush}
              disabled={isProcessingPush}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              <span>{isProcessingPush ? 'Subscribing...' : 'Enable Web Push'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSendTestPush}
                disabled={isProcessingPush}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isProcessingPush ? 'animate-spin' : ''}`} />
                <span>Send Test Push Notification</span>
              </button>
              <button
                onClick={handleUnsubscribePush}
                disabled={isProcessingPush}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Unsubscribe
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Category Manager
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category (e.g. Deep Work, Meds, Coding)..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {settings.customCategories.map((cat) => (
            <span
              key={cat}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>{cat}</span>
              <button
                onClick={() => handleRemoveCategory(cat)}
                className="text-slate-400 hover:text-rose-500"
                title={`Remove ${cat}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Backup, Export & Restore
        </h3>
        <p className="text-xs text-slate-500">
          Export full JSON archives of your task schedules and history, or export task lists to CSV.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4 text-indigo-500" />
            <span>Export JSON Backup</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Tasks (CSV)</span>
          </button>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer">
            <Upload className="h-4 w-4 text-amber-500" />
            <span>Import JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Import Preview Modal */}
        {importPreview && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Restore Preview: {importPreview.taskCount} tasks, {importPreview.occurrenceCount} historical occurrences
            </h4>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-indigo-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Merge with existing</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-indigo-600"
                />
                <span className="font-semibold text-rose-600">Replace current data</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={executeImport}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Confirm Restore
              </button>
              <button
                onClick={() => setImportPreview(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset All Local Data</span>
          </button>
        </div>
      </div>

      {/* Genuine Native Android Companion & Widgets Guide */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Native Android Companion & Home-Screen Widgets
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real Kotlin AppWidgets with Glance & AppWidgetProvider in <code className="font-mono text-indigo-600 dark:text-indigo-400">/android</code>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          RoutineFlow includes a full-fledged native Android project located in the <code className="font-mono bg-indigo-100 dark:bg-indigo-950/70 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300">/android</code> folder. These are genuine Android AppWidgets that you can place directly on your Android phone or tablet home screen:
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Widget A: Today's Tasks
            </div>
            <p className="mt-1 text-slate-500">
              Shows current date, completion progress bar, pending tasks, scheduled times, and instant checkbox completion directly from the home screen.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Widget B: Weekly Routine
            </div>
            <p className="mt-1 text-slate-500">
              Displays all 7 weekdays in configured order, daily progress indicators, and task counts. Tap any day to launch the daily agenda.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Widget C: Next Reminder
            </div>
            <p className="mt-1 text-slate-500">
              Displays next upcoming scheduled routine and its countdown time. Dynamically updates when tasks complete or change.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Widget D: Quick Add
            </div>
            <p className="mt-1 text-slate-500">
              Instant 1-tap launcher into the task creation intent from your home screen.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-slate-300">
          <div className="text-slate-400 font-bold mb-1"># Quick Build & Install:</div>
          <div>cd android</div>
          <div>./gradlew assembleDebug</div>
          <div>adb install app/build/outputs/apk/debug/app-debug.apk</div>
        </div>
      </div>
    </div>
  );
};
