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
    // ESS HR App project
    {
      id: 1101,
      name: 'Implement leave module API',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'in_progress',
      priority: 'high',
      deadline: '2026-03-20',
      description: 'Build leave management REST endpoints including balance, requests, approval workflow.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: ['leave_api_spec.pdf', 'erd_diagram.png'],
      total_hours_logged: 14.5,
    },
    {
      id: 1102,
      name: 'Design attendance UI',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'review',
      priority: 'normal',
      deadline: '2026-03-18',
      description: 'Create Figma mockups for attendance screens: daily sheet, monthly sheet, calendar.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: ['attendance_mockups_v2.fig'],
      total_hours_logged: 11.0,
    },
    {
      id: 1103,
      name: 'Write unit tests for auth',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'backlog',
      priority: 'normal',
      deadline: '2026-03-30',
      description: 'Cover login, token refresh, and logout flows with Jest unit tests.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 3.5,
    },
    {
      id: 1104,
      name: 'Deploy to staging server',
      project: 'ESS HR App',
      project_id: 10,
      stage: 'done',
      priority: 'urgent',
      deadline: '2026-03-10',
      description: 'Set up Docker Compose, CI pipeline, and staging environment.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 5.0,
    },
    // Retail Portal project
    {
      id: 1105,
      name: 'Mobile app onboarding flow',
      project: 'Retail Portal',
      project_id: 11,
      stage: 'in_progress',
      priority: 'high',
      deadline: '2026-03-25',
      description: 'Design and implement splash, walkthrough, and permission screens for the retail mobile app.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: ['onboarding_flow.pdf'],
      total_hours_logged: 6.0,
    },
    {
      id: 1106,
      name: 'Dashboard widget redesign',
      project: 'Retail Portal',
      project_id: 11,
      stage: 'review',
      priority: 'normal',
      deadline: '2026-03-22',
      description: 'Redesign KPI cards, bar charts, and quick-action widgets to match new design system.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 4.5,
    },
    {
      id: 1107,
      name: 'Payment gateway integration',
      project: 'Retail Portal',
      project_id: 11,
      stage: 'backlog',
      priority: 'urgent',
      deadline: '2026-04-05',
      description: 'Integrate Hyperpay payment gateway for credit card and mada payments.',
      assigned_to: 'Ahmed Al-Farsi',
      attachments: [],
      total_hours_logged: 0,
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 7, totalPages: 1},
};
