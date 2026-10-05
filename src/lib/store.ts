import { supabase } from './supabase';
import { Sprint, TaskItem, SubTask, TaskStatus, Priority } from './types';

// ==========================================
// UUID HELPERS & GUARDS
// ==========================================
export function isUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==========================================
// ==========================================
// SPRINTS (Direct to Supabase, with UUID guard)
// ==========================================
let cachedProjectId: string | null | undefined = undefined;

export async function getOrCreateProjectId(): Promise<string | null> {
  if (cachedProjectId !== undefined) return cachedProjectId;
  try {
    // 1. Try to get existing project
    const { data: existing } = await supabase.from('projects').select('id').limit(1).maybeSingle();
    if (existing?.id) {
      cachedProjectId = existing.id;
      return cachedProjectId;
    }
    // 2. Try to insert default project if table exists
    const { data: created } = await supabase
      .from('projects')
      .insert([{ name: 'Personal Scrum Workspace' }])
      .select('id')
      .maybeSingle();
    if (created?.id) {
      cachedProjectId = created.id;
      return cachedProjectId;
    }
  } catch {
    // projects table might not exist or RLS might block
  }
  cachedProjectId = null;
  return null;
}

export async function getSprints(): Promise<Sprint[]> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getSprints notice:', error.message);
      return getLocalSprints();
    }
    if (data && data.length > 0) return data;

    // If Supabase table is empty, auto-seed default sprint into Supabase
    // so foreign key constraint (tasks_sprint_id_fkey) is satisfied!
    try {
      const projectId = await getOrCreateProjectId();
      const defaultPayload: any = {
        name: 'Sprint 1: Foundation & Core Features',
        goal: 'Build the core personal progress tracker and verify Kanban workflow',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
      };
      if (projectId) defaultPayload.project_id = projectId;

      const { data: seededSprint, error: seedError } = await supabase
        .from('sprints')
        .insert([defaultPayload])
        .select()
        .single();

      if (!seedError && seededSprint) {
        return [seededSprint];
      }
    } catch {
      // ignore
    }

    return getLocalSprints();
  } catch (err) {
    return getLocalSprints();
  }
}

export async function createSprint(input: Omit<Sprint, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Sprint> {
  try {
    const projectId = await getOrCreateProjectId();
    const payload: any = {
      name: input.name,
      goal: input.goal || null,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status || 'active',
    };
    if (input.id && isUUID(input.id)) {
      payload.id = input.id;
    }
    if (projectId) {
      payload.project_id = projectId;
    }

    let { data, error } = await supabase
      .from('sprints')
      .insert([payload])
      .select()
      .single();

    // If error because project_id was missing (NOT NULL constraint)
    if (error && error.message.includes('project_id')) {
      const fallbackProjectId = await getOrCreateProjectId();
      if (fallbackProjectId) {
        payload.project_id = fallbackProjectId;
        const retry = await supabase.from('sprints').insert([payload]).select().single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.warn('Supabase createSprint notice:', error.message);
      return createLocalSprint(input);
    }
    return data;
  } catch (err) {
    return createLocalSprint(input);
  }
}

export async function updateSprint(id: string, patch: Partial<Sprint>): Promise<Sprint> {
  // If not a valid UUID, don't query Supabase (prevents Postgres type error)
  if (!isUUID(id)) {
    return updateLocalSprint(id, patch);
  }

  try {
    const { data, error } = await supabase
      .from('sprints')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Supabase updateSprint notice:', error.message);
      return updateLocalSprint(id, patch);
    }
    return data;
  } catch (err) {
    return updateLocalSprint(id, patch);
  }
}

export async function deleteSprint(id: string): Promise<void> {
  if (isUUID(id)) {
    try {
      // Safely move sprint's tasks to backlog (sprint_id: null)
      await supabase.from('tasks').update({ sprint_id: null }).eq('sprint_id', id);
      await supabase.from('sprints').delete().eq('id', id);
    } catch (err) {
      // ignore
    }
  }
  deleteLocalSprint(id);
}

// ==========================================
// TASKS (Direct to Supabase, with UUID guard)
// ==========================================
export async function getTasks(sprintId?: string | null): Promise<TaskItem[]> {
  try {
    // If a non-UUID sprintId is passed, don't query Supabase to prevent Postgres syntax error
    if (sprintId && !isUUID(sprintId)) {
      return getLocalTasks(sprintId);
    }

    let query = supabase
      .from('tasks')
      .select('*, subtasks(*)');

    if (sprintId !== undefined) {
      if (sprintId === null) {
        query = query.is('sprint_id', null);
      } else {
        query = query.eq('sprint_id', sprintId);
      }
    }

    const { data, error } = await query.order('position', { ascending: true });

    if (error) {
      console.warn('Supabase getTasks notice:', error.message);
      return getLocalTasks(sprintId);
    }
    return data || [];
  } catch (err) {
    return getLocalTasks(sprintId);
  }
}

export async function createTask(input: {
  title: string;
  description?: string | null;
  sprint_id?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  story_points?: number;
  tags?: string[];
  subtasks?: { title: string; is_completed?: boolean }[];
}): Promise<TaskItem> {
  try {
    let validSprintId = isUUID(input.sprint_id) ? input.sprint_id : null;

    const taskPayload: any = {
      title: input.title,
      description: input.description || null,
      sprint_id: validSprintId,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      story_points: input.story_points ?? 1,
      tags: input.tags || [],
      position: Math.floor(Date.now() / 1000),
    };

    let { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert([taskPayload])
      .select()
      .single();

    // Handle foreign key constraint failure if sprint does not exist in Supabase
    if (taskError && taskError.message.includes('tasks_sprint_id_fkey')) {
      console.warn('Sprint ID not found in Supabase. Attempting auto-sync...');
      const localSprint = getLocalSprints().find(s => s.id === validSprintId);
      if (localSprint) {
        const syncedSprint = await createSprint({
          id: localSprint.id,
          name: localSprint.name,
          goal: localSprint.goal,
          start_date: localSprint.start_date,
          end_date: localSprint.end_date,
          status: localSprint.status,
        });
        if (syncedSprint && isUUID(syncedSprint.id)) {
          const retry = await supabase.from('tasks').insert([taskPayload]).select().single();
          task = retry.data;
          taskError = retry.error;
        }
      }

      // If still failing or no local sprint found, fallback to backlog (sprint_id: null) so task is preserved in Supabase
      if (taskError) {
        console.warn('Saving task to backlog without sprint_id...');
        taskPayload.sprint_id = null;
        const retryNull = await supabase.from('tasks').insert([taskPayload]).select().single();
        task = retryNull.data;
        taskError = retryNull.error;
      }
    }

    if (taskError) {
      console.warn('Supabase createTask notice:', taskError.message);
      return createLocalTask(input);
    }

    // Insert subtasks if any
    if (input.subtasks && input.subtasks.length > 0) {
      const subtaskPayloads = input.subtasks.map((st, idx) => ({
        task_id: task.id,
        title: st.title,
        is_completed: st.is_completed ?? false,
        position: idx,
      }));

      const { data: createdSubtasks } = await supabase
        .from('subtasks')
        .insert(subtaskPayloads)
        .select();

      task.subtasks = createdSubtasks || [];
    } else {
      task.subtasks = [];
    }

    return task;
  } catch (err) {
    return createLocalTask(input);
  }
}

export async function updateTask(id: string, patch: Partial<TaskItem>): Promise<TaskItem> {
  if (!isUUID(id)) {
    return updateLocalTask(id, patch);
  }

  try {
    const { subtasks, ...taskFields } = patch;
    if (taskFields.sprint_id && !isUUID(taskFields.sprint_id)) {
      taskFields.sprint_id = null;
    }

    let { data, error } = await supabase
      .from('tasks')
      .update(taskFields)
      .eq('id', id)
      .select('*, subtasks(*)')
      .single();

    if (error && error.message.includes('tasks_sprint_id_fkey')) {
      taskFields.sprint_id = null;
      const retry = await supabase
        .from('tasks')
        .update(taskFields)
        .eq('id', id)
        .select('*, subtasks(*)')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Supabase updateTask notice:', error.message);
      return updateLocalTask(id, patch);
    }
    return data;
  } catch (err) {
    return updateLocalTask(id, patch);
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (isUUID(id)) {
    try {
      await supabase.from('subtasks').delete().eq('task_id', id);
    } catch (err) {}

    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) {}
  }

  deleteLocalTask(id);
}

// ==========================================
// SUBTASKS
// ==========================================
export async function toggleSubtask(id: string, is_completed: boolean): Promise<void> {
  if (isUUID(id)) {
    try {
      await supabase
        .from('subtasks')
        .update({ is_completed })
        .eq('id', id);
    } catch (err) {}
  }
  toggleLocalSubtask(id, is_completed);
}

export async function addSubtask(taskId: string, title: string): Promise<SubTask> {
  if (isUUID(taskId)) {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert([{
          task_id: taskId,
          title,
          is_completed: false,
          position: Math.floor(Date.now() / 1000),
        }])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {}
  }

  return addLocalSubtask(taskId, title);
}

export async function deleteSubtask(id: string): Promise<void> {
  if (isUUID(id)) {
    try {
      await supabase.from('subtasks').delete().eq('id', id);
    } catch (err) {}
  }
  deleteLocalSubtask(id);
}

// ==========================================
// LOCAL STORAGE STORAGE (Clean UUID v2 format)
// ==========================================
const LOCAL_STORAGE_KEY = 'scrum_tracker_data_v2';

interface LocalStoreData {
  sprints: Sprint[];
  tasks: TaskItem[];
}

function getStoredData(): LocalStoreData {
  if (typeof window === 'undefined') return { sprints: [], tasks: [] };
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return initDefaultData();
    return JSON.parse(raw);
  } catch {
    return initDefaultData();
  }
}

function saveStoredData(data: LocalStoreData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function initDefaultData(): LocalStoreData {
  const sprintId = generateUUID();
  const defaultSprint: Sprint = {
    id: sprintId,
    name: 'Sprint 1: Foundation & Core Features',
    goal: 'Build the core personal progress tracker and verify Kanban workflow',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  };

  const taskId1 = generateUUID();
  const taskId2 = generateUUID();
  const taskId3 = generateUUID();

  const defaultTasks: TaskItem[] = [
    {
      id: taskId1,
      sprint_id: sprintId,
      title: 'Desain skema database di Supabase',
      description: 'Menjalankan skema SQL untuk tasks, sprints, dan subtasks.',
      status: 'done',
      priority: 'urgent',
      story_points: 3,
      tags: ['Backend', 'Database'],
      position: 1,
      subtasks: [
        { id: generateUUID(), task_id: taskId1, title: 'Jalankan SQL enum & tabel', is_completed: true, position: 0 },
      ],
    },
    {
      id: taskId2,
      sprint_id: sprintId,
      title: 'Bangun komponen visual Kanban Board & Drag and Drop',
      description: 'Implementasi 4 status kolom: To Do, In Progress, In Review, Done.',
      status: 'in_progress',
      priority: 'high',
      story_points: 5,
      tags: ['Frontend', 'UI'],
      position: 2,
      subtasks: [
        { id: generateUUID(), task_id: taskId2, title: 'Buat kartu tugas dengan badge prioritas', is_completed: true, position: 0 },
        { id: generateUUID(), task_id: taskId2, title: 'Fitur geser status instan', is_completed: false, position: 1 },
      ],
    },
    {
      id: taskId3,
      sprint_id: sprintId,
      title: 'Integrasi widget Velocity & Story Points burndown',
      description: 'Menghitung persentase progres sprint dan menampilkan visual ringkasan poin.',
      status: 'todo',
      priority: 'medium',
      story_points: 2,
      tags: ['Analytics'],
      position: 3,
      subtasks: [],
    },
  ];

  const initial = { sprints: [defaultSprint], tasks: defaultTasks };
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  }
  return initial;
}

function getLocalSprints(): Sprint[] {
  return getStoredData().sprints;
}

function createLocalSprint(input: Omit<Sprint, 'id'>): Sprint {
  const store = getStoredData();
  const newSprint: Sprint = { ...input, id: generateUUID() };
  store.sprints.unshift(newSprint);
  saveStoredData(store);
  return newSprint;
}

function updateLocalSprint(id: string, patch: Partial<Sprint>): Sprint {
  const store = getStoredData();
  const idx = store.sprints.findIndex(s => s.id === id);
  if (idx !== -1) {
    store.sprints[idx] = { ...store.sprints[idx], ...patch };
    saveStoredData(store);
    return store.sprints[idx];
  }
  throw new Error('Sprint not found');
}

function deleteLocalSprint(id: string): void {
  const store = getStoredData();
  store.sprints = store.sprints.filter(s => s.id !== id);
  store.tasks = store.tasks.map(t => t.sprint_id === id ? { ...t, sprint_id: null } : t);
  saveStoredData(store);
}

function getLocalTasks(sprintId?: string | null): TaskItem[] {
  const store = getStoredData();
  if (sprintId === undefined) return store.tasks;
  return store.tasks.filter(t => t.sprint_id === sprintId);
}

function createLocalTask(input: any): TaskItem {
  const store = getStoredData();
  const taskId = generateUUID();
  const newTask: TaskItem = {
    id: taskId,
    title: input.title,
    description: input.description || null,
    sprint_id: input.sprint_id || null,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    story_points: input.story_points ?? 1,
    tags: input.tags || [],
    position: Math.floor(Date.now() / 1000),
    subtasks: (input.subtasks || []).map((st: any, i: number) => ({
      id: generateUUID(),
      task_id: taskId,
      title: st.title,
      is_completed: st.is_completed ?? false,
      position: i,
    })),
  };
  store.tasks.push(newTask);
  saveStoredData(store);
  return newTask;
}

function updateLocalTask(id: string, patch: Partial<TaskItem>): TaskItem {
  const store = getStoredData();
  const idx = store.tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    store.tasks[idx] = { ...store.tasks[idx], ...patch };
    saveStoredData(store);
    return store.tasks[idx];
  }
  throw new Error('Task not found');
}

function deleteLocalTask(id: string): void {
  const store = getStoredData();
  store.tasks = store.tasks.filter(t => t.id !== id);
  saveStoredData(store);
}

function toggleLocalSubtask(id: string, is_completed: boolean): void {
  const store = getStoredData();
  for (const t of store.tasks) {
    if (t.subtasks) {
      const st = t.subtasks.find(s => s.id === id);
      if (st) {
        st.is_completed = is_completed;
        saveStoredData(store);
        return;
      }
    }
  }
}

function addLocalSubtask(taskId: string, title: string): SubTask {
  const store = getStoredData();
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  if (!task.subtasks) task.subtasks = [];
  const newSt: SubTask = {
    id: generateUUID(),
    task_id: taskId,
    title,
    is_completed: false,
    position: task.subtasks.length,
  };
  task.subtasks.push(newSt);
  saveStoredData(store);
  return newSt;
}

function deleteLocalSubtask(id: string): void {
  const store = getStoredData();
  for (const t of store.tasks) {
    if (t.subtasks) {
      t.subtasks = t.subtasks.filter(s => s.id !== id);
    }
  }
  saveStoredData(store);
}

// Export / Import JSON
export function exportDataAsJSON() {
  const data = getStoredData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scrum_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.sprints) && Array.isArray(data.tasks)) {
      saveStoredData(data);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Invalid JSON file', err);
    return false;
  }
}
