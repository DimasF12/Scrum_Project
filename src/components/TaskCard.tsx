'use client';

import { useState } from 'react';
import { TaskItem, Priority, TaskStatus } from '@/lib/types';
import { 
  CheckSquare, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Tag as TagIcon 
} from 'lucide-react';

interface TaskCardProps {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (subtaskId: string, currentStatus: boolean) => void;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
  medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  low: { label: 'Low', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
}: TaskCardProps) {
  const [expandedSubtasks, setExpandedSubtasks] = useState(false);
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const currentStatusIdx = STATUS_ORDER.indexOf(task.status);

  const completedSubtasks = task.subtasks?.filter(st => st.is_completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  const moveLeft = () => {
    if (currentStatusIdx > 0) {
      onStatusChange(task.id, STATUS_ORDER[currentStatusIdx - 1]);
    }
  };

  const moveRight = () => {
    if (currentStatusIdx < STATUS_ORDER.length - 1) {
      onStatusChange(task.id, STATUS_ORDER[currentStatusIdx + 1]);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative bg-white hover:bg-slate-50/80 dark:bg-[#111622] dark:hover:bg-[#151c2c] border border-slate-200 hover:border-blue-400 dark:border-[#1e2638] dark:hover:border-blue-500/40 rounded-xl p-4 transition-all duration-150 shadow-xs cursor-grab active:cursor-grabbing"
    >
      {/* Header: Priority & Story Points */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityInfo.color} ${priorityInfo.border}`}
        >
          {priorityInfo.label}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 dark:bg-[#192233] dark:text-blue-400 dark:border-[#232f46] font-medium">
            {task.story_points} SP
          </span>

          {/* Quick Action buttons - Always visible */}
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e273b] rounded-lg transition cursor-pointer"
              title="Edit Task"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition cursor-pointer"
              title="Delete Task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Task Title - Click to edit */}
      <h3
        onClick={() => onEdit(task)}
        className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug mb-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
      >
        {task.title}
      </h3>

      {/* Task Description snippet */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#182030] dark:text-slate-400 dark:border-[#232e44]"
            >
              <TagIcon size={10} className="text-slate-400" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtasks Progress / Toggle */}
      {totalSubtasks > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1a2233]">
          <button
            onClick={() => setExpandedSubtasks(!expandedSubtasks)}
            className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition py-0.5 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <CheckSquare size={13} className={completedSubtasks === totalSubtasks ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'} />
              <span>{completedSubtasks} of {totalSubtasks} subtasks</span>
            </span>
            {expandedSubtasks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {expandedSubtasks && (
            <div className="space-y-1.5 mt-2 pl-1">
              {task.subtasks?.map((st) => (
                <label
                  key={st.id}
                  className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={st.is_completed}
                    onChange={() => onToggleSubtask(st.id, st.is_completed)}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090c13] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={st.is_completed ? 'line-through text-slate-400' : ''}>
                    {st.title}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Move Status Footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-[#171f2e] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <button
          onClick={moveLeft}
          disabled={currentStatusIdx <= 0}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1a2336] hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={13} /> Prev
        </button>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
          {task.status.replace('_', ' ')}
        </span>

        <button
          onClick={moveRight}
          disabled={currentStatusIdx >= STATUS_ORDER.length - 1}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1a2336] hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
