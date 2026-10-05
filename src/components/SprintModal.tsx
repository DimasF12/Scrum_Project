'use client';

import { useState, useEffect } from 'react';
import { Sprint, SprintStatus } from '@/lib/types';
import { X, Calendar, Flag, Trash2 } from 'lucide-react';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void> | void;
  initialSprint?: Sprint | null;
}

export default function SprintModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialSprint,
}: SprintModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SprintStatus>('active');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSprint) {
      setName(initialSprint.name);
      setGoal(initialSprint.goal || '');
      setStartDate(initialSprint.start_date);
      setEndDate(initialSprint.end_date);
      setStatus(initialSprint.status);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setName('Sprint ' + (new Date().getMonth() + 1));
      setGoal('');
      setStartDate(today);
      setEndDate(twoWeeksLater);
      setStatus('active');
    }
  }, [initialSprint, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        goal: goal.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1e2638] rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 transition-colors duration-150">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-[#1c2436]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flag size={18} className="text-blue-500 dark:text-blue-400" />
            {initialSprint ? 'Edit Sprint' : 'Create New Sprint'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition p-1 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 2: Core Kanban Board"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint Goal
            </label>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the key outcome or objective of this sprint?"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar size={13} /> Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar size={13} /> End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sprint Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SprintStatus)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090c13] border border-slate-200 dark:border-[#1e2638] rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1c2436]">
            {initialSprint && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${initialSprint.name}"? Any remaining tasks will be moved to the backlog.`)) {
                    onDelete(initialSprint.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Delete Sprint
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-[#192233] rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {loading ? 'Saving...' : initialSprint ? 'Update Sprint' : 'Create Sprint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
