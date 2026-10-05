'use client';

import { TaskItem } from '@/lib/types';
import { BarChart3, CheckCircle2, ListTodo, PlayCircle, Eye } from 'lucide-react';

interface AnalyticsWidgetProps {
  tasks: TaskItem[];
}

export default function AnalyticsWidget({ tasks }: AnalyticsWidgetProps) {
  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const donePoints = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + (t.story_points || 0), 0);
  const remainingPoints = totalPoints - donePoints;

  return (
    <div className="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-[#1a2233] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors duration-150">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <BarChart3 size={15} className="text-blue-500 dark:text-blue-400" /> Sprint Metrics & Velocity
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Total: {totalTasks} tasks
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1f293d] rounded-xl p-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Story Points</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">{totalPoints} <span className="text-xs text-slate-400 font-normal">SP</span></p>
        </div>

        <div className="bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1f293d] rounded-xl p-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Points Completed</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{donePoints} <span className="text-xs text-slate-400 font-normal">SP</span></p>
        </div>

        <div className="bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1f293d] rounded-xl p-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Remaining Points</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">{remainingPoints} <span className="text-xs text-slate-400 font-normal">SP</span></p>
        </div>

        <div className="bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1f293d] rounded-xl p-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Sprint Velocity</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Task distribution bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-[#192233] text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <ListTodo size={13} className="text-slate-400" />
          <span>To Do: <strong className="text-slate-800 dark:text-slate-200">{todoCount}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <PlayCircle size={13} className="text-blue-500 dark:text-blue-400" />
          <span>In Progress: <strong className="text-slate-800 dark:text-slate-200">{inProgressCount}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Eye size={13} className="text-amber-500 dark:text-amber-400" />
          <span>In Review: <strong className="text-slate-800 dark:text-slate-200">{reviewCount}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
          <span>Done: <strong className="text-slate-800 dark:text-slate-200">{doneCount}</strong></span>
        </div>
      </div>
    </div>
  );
}
