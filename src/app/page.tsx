'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sprint, TaskItem, TaskStatus } from '@/lib/types';
import { 
  getSprints, 
  createSprint, 
  updateSprint, 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  toggleSubtask,
  deleteSprint 
} from '@/lib/store';
import SprintHeader from '@/components/SprintHeader';
import KanbanBoard from '@/components/KanbanBoard';
import AnalyticsWidget from '@/components/AnalyticsWidget';
import TaskModal from '@/components/TaskModal';
import SprintModal from '@/components/SprintModal';
import { Plus, RefreshCw } from 'lucide-react';

export default function Home() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>('todo');

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadedSprints = await getSprints();
      setSprints(loadedSprints);

      // Find active sprint or fallback to first
      let current = loadedSprints.find(s => s.status === 'active') || loadedSprints[0] || null;
      setActiveSprint(current);

      const loadedTasks = await getTasks(current ? current.id : undefined);
      setTasks(loadedTasks);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching sprint
  const handleSelectSprint = async (sprintId: string) => {
    const selected = sprints.find(s => s.id === sprintId) || null;
    setActiveSprint(selected);
    if (selected) {
      const loadedTasks = await getTasks(selected.id);
      setTasks(loadedTasks);
    }
  };

  // Task Operations
  const handleOpenAddTask = (status: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTaskDefaultStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, {
        ...taskData,
        sprint_id: activeSprint ? activeSprint.id : null,
      });
      setTasks(tasks.map(t => (t.id === updated.id ? updated : t)));
    } else {
      const created = await createTask({
        ...taskData,
        sprint_id: activeSprint ? activeSprint.id : null,
      });
      setTasks([...tasks, created]);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      loadData();
    }
  };

  // Drag & drop or quick move status change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update for instant visual response
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      loadData();
    }
  };

  // Subtask checkbox toggle
  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    // Optimistic update
    setTasks(prev =>
      prev.map(task => {
        if (!task.subtasks) return task;
        return {
          ...task,
          subtasks: task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, is_completed: !currentStatus } : st
          ),
        };
      })
    );

    try {
      await toggleSubtask(subtaskId, !currentStatus);
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      loadData();
    }
  };

  // Sprint Operations
  const handleOpenNewSprint = () => {
    setEditingSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleOpenEditSprint = () => {
    setEditingSprint(activeSprint);
    setIsSprintModalOpen(true);
  };

  const handleSaveSprint = async (sprintData: any) => {
    if (editingSprint) {
      const updated = await updateSprint(editingSprint.id, sprintData);
      setSprints(sprints.map(s => (s.id === updated.id ? updated : s)));
      setActiveSprint(updated);
    } else {
      const created = await createSprint(sprintData);
      setSprints([created, ...sprints]);
      setActiveSprint(created);
      // Refresh tasks for new sprint
      const loadedTasks = await getTasks(created.id);
      setTasks(loadedTasks);
    }
  };

  // Complete sprint flow
  const handleCompleteSprint = async () => {
    if (!activeSprint) return;
    if (
      confirm(
        `Complete "${activeSprint.name}"? This will mark the sprint as completed.`
      )
    ) {
      await updateSprint(activeSprint.id, { status: 'completed' });
      await loadData();
    }
  };

  // Delete sprint flow
  const handleDeleteSprint = async (sprintId: string) => {
    const sprintToDelete = sprints.find(s => s.id === sprintId);
    if (
      confirm(
        `Are you sure you want to delete "${sprintToDelete?.name || 'this sprint'}"? Any remaining tasks will be moved to the backlog.`
      )
    ) {
      await deleteSprint(sprintId);
      const remaining = sprints.filter(s => s.id !== sprintId);
      setSprints(remaining);
      if (activeSprint?.id === sprintId) {
        const nextSprint = remaining[0] || null;
        setActiveSprint(nextSprint);
        const loadedTasks = await getTasks(nextSprint ? nextSprint.id : null);
        setTasks(loadedTasks);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#090c13] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Sprint & Progress Navigation */}
      <SprintHeader
        sprints={sprints}
        activeSprint={activeSprint}
        tasks={tasks}
        onSelectSprint={handleSelectSprint}
        onOpenNewSprint={handleOpenNewSprint}
        onOpenEditSprint={handleOpenEditSprint}
        onDeleteSprint={handleDeleteSprint}
        onRefreshData={loadData}
        onCompleteSprint={handleCompleteSprint}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-mono">Loading Scrum workspace...</span>
          </div>
        ) : (
          <>
            {/* Velocity & Sprint Metrics Widget */}
            <AnalyticsWidget tasks={tasks} />

            {/* Kanban Scrum Board */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                    Scrum Board
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drag and drop cards or use quick-move arrows to advance tasks.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenAddTask('todo')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition cursor-pointer"
                >
                  <Plus size={15} /> New Task
                </button>
              </div>

              <KanbanBoard
                tasks={tasks}
                onAddTask={handleOpenAddTask}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onStatusChange={handleStatusChange}
                onToggleSubtask={handleToggleSubtask}
              />
            </div>
          </>
        )}
      </main>

      {/* Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        defaultStatus={taskDefaultStatus}
      />

      {/* Sprint Modal (Create & Edit) */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSave={handleSaveSprint}
        onDelete={handleDeleteSprint}
        initialSprint={editingSprint}
      />
    </div>
  );
}
