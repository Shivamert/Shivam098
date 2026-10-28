import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Repeat,
  BarChart3,
  Settings,
  Plus
} from 'lucide-react';

export type NavTab = 'home' | 'calendar' | 'tasks' | 'routines' | 'stats' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTask: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenNewTask,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'tasks' as NavTab, label: 'All Tasks', icon: CheckSquare },
    { id: 'routines' as NavTab, label: 'Routines', icon: Repeat },
    { id: 'stats' as NavTab, label: 'Statistics', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Horizontal Navigation Bar */}
      <nav aria-label="Desktop Navigation" className="hidden lg:block border-b border-slate-200 bg-white/50 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-600 transition"
            aria-label="Add new task or routine"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Task or Routine</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button (Tablet & Mobile & Desktop quick trigger) */}
      <button
        onClick={onOpenNewTask}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 lg:hidden"
        title="Add new task"
        aria-label="Add new task"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-lg dark:border-slate-800/90 dark:bg-slate-900/95 lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center rounded-xl p-1.5 transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="mt-0.5 text-[10px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
