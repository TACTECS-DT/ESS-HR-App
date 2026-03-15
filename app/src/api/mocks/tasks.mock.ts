import {ApiSuccess} from '../../types/api';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStage = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: number;
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

export const MOCK_TASKS: ApiSuccess<Task[]> = {
  success: true,
  data: [
    {
      id: 1101,
      name: 'Implement leave module API',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'in_progress',
      priority: 'high',
      deadline: '2026-03-20',
      description: 'Build leave management REST endpoints.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 4.5,
    },
    {
      id: 1102,
      name: 'Design attendance UI',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'review',
      priority: 'normal',
      deadline: '2026-03-18',
      description: 'Create Figma mockups for attendance screens.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 8.0,
    },
    {
      id: 1103,
      name: 'Write unit tests for auth',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'backlog',
      priority: 'normal',
      deadline: '2026-03-30',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 0,
    },
    {
      id: 1104,
      name: 'Deploy to staging server',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'done',
      priority: 'urgent',
      deadline: '2026-03-10',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 2.0,
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 4, totalPages: 1},
};
