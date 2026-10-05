'use client';

import { useState, useEffect } from 'react';
import { Sprint, TaskItem } from '@/lib/types';
import { 
  Calendar, 
  Target, 
  Clock, 
  Plus, 
  Download, 
  Upload, 
  User, 
  CheckCircle, 
  ChevronDown, 
  Edit2, 
  Sun, 
  Moon,
  Trash2
} from 'lucide-react';
import { exportDataAsJSON, importDataFromJSON } from '@/lib/store';

interface SprintHeaderProps {
  sprints: Sprint[];
  activeSprint: Sprint | null;
  tasks: TaskItem[];
  onSelectSprint: (sprintId: string) => void;
  onOpenNewSprint: () => void;
  onOpenEditSprint: () => void;
  onDeleteSprint?: (sprintId: string) => void;
  onRefreshData: () => void;
  onCompleteSprint: () => void;
}

export default function SprintHeader({
  sprints,
  activeSprint,
  tasks,
  onSelectSprint,
  onOpenNewSprint,
  onOpenEditSprint,
  onDeleteSprint,
  onRefreshData,
  onCompleteSprint,
}: SprintHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('scrum_theme') as 'dark' | 'light' | null;
    const initial = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(initial);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('scrum_theme', nextTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(nextTheme);
  };

  // Metrics calculation
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const donePoints = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + (t.story_points || 0), 0);
  const pointsProgressPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Days remaining calculation
  let daysRemainingText = 'No dates set';
  if (activeSprint?.end_date) {
    const end = new Date(activeSprint.end_date).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      daysRemainingText = `Ended ${Math.abs(diffDays)}d ago`;
    } else if (diffDays === 0) {
      daysRemainingText = 'Ends today';
    } else {
      daysRemainingText = `${diffDays} days left`;
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importDataFromJSON(content)) {
        alert('Backup data restored successfully!');
        onRefreshData();
      } else {
        alert('Failed to import backup file. Ensure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="border-b border-slate-200 dark:border-[#1a2233] bg-white/95 dark:bg-[#0c1018]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4 transition-colors duration-150">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Bar: Title, Sprint Selector, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Scrum Tracker</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                  Solo Dev
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {activeSprint ? activeSprint.name : 'Personal Progress Board'}
              </h1>
            </div>

            {/* Sprint Switcher Dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#141a29] dark:hover:bg-[#1a2336] border border-slate-200 dark:border-[#222c42] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <span>Switch Sprint</span>
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Sprints
                  </div>
                  {sprints.map((s) => (
                    <div
                      key={s.id}
                      className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1a2233] transition ${
                        s.id === activeSprint?.id
                          ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/70 dark:bg-[#162030]'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSprint(s.id);
                          setDropdownOpen(false);
                        }}
                        className="flex-1 text-left truncate pr-2 cursor-pointer"
                      >
                        <span>{s.name}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#192233] border border-slate-200 dark:border-[#232e42] text-slate-600 dark:text-slate-400">
                          {s.status}
                        </span>
                        {onDeleteSprint && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSprint(s.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition cursor-pointer"
                            title={`Delete ${s.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 dark:border-[#1c2436] mt-1 pt-1 px-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewSprint();
                      }}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1a2233] rounded-lg transition font-medium cursor-pointer"
                    >
                      <Plus size={14} /> Create New Sprint
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeSprint && (
              <button
                onClick={onOpenEditSprint}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#171e2e] rounded-lg transition cursor-pointer"
                title="Edit Sprint Details"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {/* Right Action Tools: Theme Toggle, Backup, Supabase Auth User */}
          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#141a29] dark:hover:bg-[#1a2336] border border-slate-200 dark:border-[#20293d] text-slate-700 dark:text-slate-300 transition flex items-center justify-center cursor-pointer shadow-xs"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-blue-600" />
              )}
            </button>

            {/* Export / Import JSON */}
            <button
              onClick={exportDataAsJSON}
              title="Backup data to JSON"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#141a29] dark:hover:bg-[#1a2336] border border-slate-200 dark:border-[#20293d] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <Download size={13} /> Export JSON
            </button>

            <label
              title="Restore data from JSON backup"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#141a29] dark:hover:bg-[#1a2336] border border-slate-200 dark:border-[#20293d] rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition"
            >
              <Upload size={13} /> Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            {/* Complete Sprint button */}
            {activeSprint && activeSprint.status === 'active' && (
              <button
                onClick={onCompleteSprint}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <CheckCircle size={13} /> Complete Sprint
              </button>
            )}
          </div>
        </div>

        {/* Sprint Meta Info & Progress Bar */}
        {activeSprint && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-200 dark:border-[#171e2e]">
            {/* Goal & Dates */}
            <div className="md:col-span-6 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <Target size={13} className="text-blue-500 dark:text-blue-400" /> Goal:
                </span>
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {activeSprint.goal || 'No goal specified for this sprint.'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {activeSprint.start_date} → {activeSprint.end_date}
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Clock size={12} /> {daysRemainingText}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="md:col-span-6 bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-[#1c2436] rounded-xl p-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">
                  Sprint Progress ({donePoints} / {totalPoints} SP)
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {pointsProgressPercent}%
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-[#1b2336] rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${pointsProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>{doneTasks} of {totalTasks} tasks done</span>
                <span>{taskProgressPercent}% tasks completed</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
