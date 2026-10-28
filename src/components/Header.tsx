import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Bell,
  BellOff,
  Download,
  Wifi,
  WifiOff,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { UserSettings } from '../types';
import { NotificationService } from '../services/notifications';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onOpenDailyReview: () => void;
  onOpenNewTask: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenDailyReview,
  onOpenNewTask,
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pushStatus, setPushStatus] = useState<string>('checking');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const st = NotificationService.getStatus();
    setPushStatus(st.permission);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const cycleTheme = () => {
    const nextTheme: UserSettings['theme'] =
      settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system';
    onUpdateSettings({ ...settings, theme: nextTheme });
    showToast(`Theme changed to ${nextTheme}`);
  };

  const handlePushToggle = async () => {
    if (pushStatus === 'granted') {
      setIsSubscribing(true);
      const res = await NotificationService.sendTestPush();
      setIsSubscribing(false);
      showToast(res.message);
    } else {
      setIsSubscribing(true);
      const res = await NotificationService.subscribeToPush();
      setIsSubscribing(false);
      if (res.success) {
        setPushStatus('granted');
        onUpdateSettings({ ...settings, pushEnabled: true });
        showToast('Web Push enabled & registered!');
      } else {
        showToast(res.message);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-md shadow-indigo-500/20 text-white">
            <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                RoutineFlow
              </span>
              <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 sm:inline-block">
                PWA & Widgets
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Daily Routines & Smart Recurrence
            </p>
          </div>
        </div>

        {/* Status badges & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              <span className="hidden md:inline">Offline Mode</span>
            </div>
          )}

          {/* Daily Review Button */}
          <button
            onClick={onOpenDailyReview}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition"
            title="Open Daily Review"
            aria-label="Daily Review"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Daily Review</span>
          </button>

          {/* Notification Quick Toggle / Test */}
          <button
            onClick={handlePushToggle}
            disabled={isSubscribing}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              pushStatus === 'granted'
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title={pushStatus === 'granted' ? 'Notifications active (Click to test)' : 'Enable push notifications'}
            aria-label="Push Notification Status"
          >
            {pushStatus === 'granted' ? (
              <>
                <Bell className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden md:inline">{isSubscribing ? 'Sending...' : 'Push Ready'}</span>
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden md:inline">{isSubscribing ? 'Connecting...' : 'Enable Push'}</span>
              </>
            )}
          </button>

          {/* Theme switcher */}
          <button
            onClick={cycleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition shadow-xs"
            title={`Current theme: ${settings.theme} (click to toggle)`}
            aria-label="Toggle application theme"
          >
            {settings.theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
            {settings.theme === 'dark' && <Moon className="h-4 w-4 text-indigo-400" />}
            {settings.theme === 'system' && <Laptop className="h-4 w-4 text-slate-400" />}
          </button>

          {/* PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition"
              aria-label="Install RoutineFlow PWA"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install PWA</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              aria-label="Install RoutineFlow on iOS"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Install iOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-18 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl dark:bg-white dark:text-slate-900 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Install RoutineFlow on iOS</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              1. Tap the <strong className="text-indigo-600 dark:text-indigo-400">Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong className="text-indigo-600 dark:text-indigo-400">Add to Home Screen</strong>.<br />
              3. RoutineFlow will launch full-screen as a standalone native app!
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
