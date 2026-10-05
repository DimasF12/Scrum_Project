'use client';

import { useState } from 'react';
import { TaskItem, TaskStatus } from '@/lib/types';
import TaskCard from './TaskCard';
import { 
  Plus, 
  Search, 
  Filter, 
  CircleDot, 
  Clock, 
  Eye, 
  CheckCircle2 
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: TaskItem[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (subtaskId: string, currentStatus: boolean) => void;
}

interface ColumnDef {
  id: TaskStatus;
  title: string;
  icon: any;
  color: string;
  badgeBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: CircleDot,
    color: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-200/70 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: Clock,
    color: 'text-blue-500 dark:text-blue-400',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  },
  {
    id: 'review',
    title: 'In Review',
    icon: Eye,
    color: 'text-amber-500 dark:text-amber-400',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  },
  {
    id: 'done',
    title: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-500 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  },
];

export default function KanbanBoard({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
}: KanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [draggingOverCol, setDraggingOverCol] = useState<TaskStatus | null>(null);

  // Filter tasks based on search & priority
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesQuery && matchesPriority;
  });

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDraggingOverCol(colId);
  };

  const handleDragLeave = () => {
    setDraggingOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDraggingOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, colId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d121c] p-3 rounded-xl border border-slate-200 dark:border-[#192233] shadow-xs transition-colors duration-150">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, descriptions, or tags..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter size={13} />
            <span className="hidden sm:inline">Priority:</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter(t => t.status === column.id);
          const colStoryPoints = colTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
          const Icon = column.icon;
          const isDraggingOver = draggingOverCol === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col bg-slate-50/75 dark:bg-[#0d121c]/80 border rounded-2xl p-3 min-h-[480px] transition-all duration-150 shadow-xs ${
                isDraggingOver
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/10 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-[#192233]'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#171f2e]">
                <div className="flex items-center gap-2">
                  <Icon size={16} className={column.color} />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {column.title}
                  </h2>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${column.badgeBg}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {colStoryPoints} SP
                  </span>
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1b2438] rounded-md transition cursor-pointer"
                    title={`Add task to ${column.title}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div
                    onClick={() => onAddTask(column.id)}
                    className="h-28 border border-dashed border-slate-300 dark:border-[#1d273a] hover:border-blue-400 dark:hover:border-slate-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer p-4 text-center hover:bg-white/50 dark:hover:bg-[#121926]/40"
                  >
                    <Plus size={16} className="mb-1" />
                    <span className="text-xs">Drop cards here or click to add</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onStatusChange={onStatusChange}
                      onToggleSubtask={onToggleSubtask}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
