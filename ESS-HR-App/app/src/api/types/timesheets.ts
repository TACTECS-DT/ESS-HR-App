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
