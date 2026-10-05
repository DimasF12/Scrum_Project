export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type SprintStatus = 'planning' | 'active' | 'completed';

export interface SubTask {
  id: string;
  task_id: string;
  user_id?: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at?: string;
}

export interface TaskItem {
  id: string;
  sprint_id: string | null;
  user_id?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  story_points: number;
  tags: string[];
  position: number;
  subtasks?: SubTask[];
  created_at?: string;
  updated_at?: string;
}

export interface Sprint {
  id: string;
  project_id?: string;
  user_id?: string;
  name: string;
  goal?: string | null;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
