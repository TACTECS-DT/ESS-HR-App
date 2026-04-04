import {ApiSuccess} from '../../types/api';

export interface TimesheetEntry {
  id: number;
  task_id: number;
  task_name: string;
  project: string;
  date: string;
  hours: number;
  description: string;
  time_start?: string;
  time_end?: string;
}

export interface DailyTimesheetSummary {
  employee_id: number;
  date: string;
  total_hours: number;
  entries: TimesheetEntry[];
}

export const MOCK_TIMESHEETS: ApiSuccess<DailyTimesheetSummary[]> = {
  success: true,
  data: [
    // Current week — Wed Mar 18
    {
      employee_id: 100,
      date: '2026-03-18',
      total_hours: 3.5,
      entries: [
        {id: 2007, task_id: 1101, task_name: 'Implement leave module API', project: 'ESS HR App', date: '2026-03-18', hours: 2.0, description: 'Reviewed PR comments', time_start: '08:32', time_end: '10:32'},
        {id: 2008, task_id: 1105, task_name: 'Mobile app onboarding flow', project: 'Retail Portal', date: '2026-03-18', hours: 1.5, description: 'Implemented step indicators', time_start: '11:00', time_end: '12:30'},
      ],
    },
    // Current week — Tue Mar 17
    {
      employee_id: 100,
      date: '2026-03-17',
      total_hours: 8.5,
      entries: [
        {id: 2005, task_id: 1102, task_name: 'Design attendance UI', project: 'ESS HR App', date: '2026-03-17', hours: 4.0, description: 'Reworked monthly sheet layout', time_start: '09:00', time_end: '13:00'},
        {id: 2006, task_id: 1105, task_name: 'Mobile app onboarding flow', project: 'Retail Portal', date: '2026-03-17', hours: 4.5, description: 'Built splash and walkthrough screens', time_start: '14:00', time_end: '18:30'},
      ],
    },
    // Current week — Mon Mar 16
    {
      employee_id: 100,
      date: '2026-03-16',
      total_hours: 8.0,
      entries: [
        {id: 2009, task_id: 1103, task_name: 'Write unit tests for auth', project: 'ESS HR App', date: '2026-03-16', hours: 3.5, description: 'Wrote token refresh and logout tests', time_start: '08:55', time_end: '12:25'},
        {id: 2010, task_id: 1106, task_name: 'Dashboard widget redesign', project: 'Retail Portal', date: '2026-03-16', hours: 4.5, description: 'Redesigned KPI widgets and charts', time_start: '13:30', time_end: '18:00'},
      ],
    },
    // Previous week — Thu Mar 12
    {
      employee_id: 100,
      date: '2026-03-12',
      total_hours: 7.5,
      entries: [
        {id: 2001, task_id: 1101, task_name: 'Implement leave module API', project: 'ESS HR App', date: '2026-03-12', hours: 4.5, description: 'Built POST /leave endpoint', time_start: '09:00', time_end: '13:30'},
        {id: 2002, task_id: 1102, task_name: 'Design attendance UI', project: 'ESS HR App', date: '2026-03-12', hours: 3.0, description: 'Finalized check-in screen design', time_start: '14:30', time_end: '17:30'},
      ],
    },
    // Previous week — Wed Mar 11
    {
      employee_id: 100,
      date: '2026-03-11',
      total_hours: 8.0,
      entries: [
        {id: 2003, task_id: 1101, task_name: 'Implement leave module API', project: 'ESS HR App', date: '2026-03-11', hours: 5.0, description: 'Database schema design', time_start: '09:00', time_end: '14:00'},
        {id: 2004, task_id: 1104, task_name: 'Deploy to staging server', project: 'ESS HR App', date: '2026-03-11', hours: 3.0, description: 'Set up Docker and CI pipeline', time_start: '14:30', time_end: '17:30'},
      ],
    },
  ],
};

export const MOCK_LOG_TIME_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 2005},
  message: 'Time logged successfully.',
};
