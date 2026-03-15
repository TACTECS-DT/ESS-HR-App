import {ApiSuccess} from '../../types/api';

export interface TimesheetEntry {
  id: number;
  task_id: number;
  task_name: string;
  project: string;
  date: string;
  hours: number;
  description: string;
}

export interface DailyTimesheetSummary {
  date: string;
  total_hours: number;
  entries: TimesheetEntry[];
}

export const MOCK_TIMESHEETS: ApiSuccess<DailyTimesheetSummary[]> = {
  success: true,
  data: [
    {
      date: '2026-03-12',
      total_hours: 7.5,
      entries: [
        {id: 2001, task_id: 1101, task_name: 'Implement leave module API', project: 'ESS HR App', date: '2026-03-12', hours: 4.5, description: 'Built POST /leave endpoint'},
        {id: 2002, task_id: 1102, task_name: 'Design attendance UI', project: 'ESS HR App', date: '2026-03-12', hours: 3.0, description: 'Finalized check-in screen design'},
      ],
    },
    {
      date: '2026-03-11',
      total_hours: 8.0,
      entries: [
        {id: 2003, task_id: 1101, task_name: 'Implement leave module API', project: 'ESS HR App', date: '2026-03-11', hours: 5.0, description: 'Database schema design'},
        {id: 2004, task_id: 1104, task_name: 'Deploy to staging server', project: 'ESS HR App', date: '2026-03-11', hours: 3.0, description: 'Set up Docker and CI pipeline'},
      ],
    },
  ],
};

export const MOCK_LOG_TIME_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 2005},
  message: 'Time logged successfully.',
};
