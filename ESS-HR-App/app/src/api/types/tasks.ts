export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStage = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: number;
  employee_id: number;
  name: string;
  project: string;
  project_id: number;
  stage: TaskStage;
  priority: TaskPriority;
  deadline?: string;
  description?: string;
  assigned_to: string;
  attachments: string[];
  total_hours_logged: number;
}
