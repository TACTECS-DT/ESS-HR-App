import {ApiSuccess} from '../../types/api';

export type AttendanceStatus = 'checked_in' | 'checked_out';
export type SheetStatus = 'draft' | 'confirmed' | 'done';
export type DayStatus = 'present' | 'absent' | 'weekend' | 'public_holiday' | 'on_leave';

export interface AttendanceRecord {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  day_status: DayStatus;
  sheet_status: SheetStatus;
  location_in?: {lat: number; lng: number};
  location_out?: {lat: number; lng: number};
  task?: string;
  notes?: string;
}

export interface AttendanceSummary {
  status: AttendanceStatus;
  check_in_time: string | null;
  hours_worked_today: number;
}

export const MOCK_ATTENDANCE_SUMMARY: ApiSuccess<AttendanceSummary> = {
  success: true,
  data: {
    status: 'checked_in',
    check_in_time: '08:32',
    hours_worked_today: 3.5,
  },
};

export const MOCK_CHECK_IN: ApiSuccess<{check_in_time: string; record_id: number}> = {
  success: true,
  data: {check_in_time: '08:32', record_id: 501},
  message: 'Checked in successfully.',
};

export const MOCK_CHECK_OUT: ApiSuccess<{check_out_time: string; worked_hours: number}> = {
  success: true,
  data: {check_out_time: '17:15', worked_hours: 8.72},
  message: 'Checked out successfully.',
};

export const MOCK_ATTENDANCE_HISTORY: ApiSuccess<AttendanceRecord[]> = {
  success: true,
  data: [
    {id: 1, date: '2026-03-12', check_in: '08:32', check_out: '17:15', worked_hours: 8.72, day_status: 'present', sheet_status: 'confirmed'},
    {id: 2, date: '2026-03-11', check_in: '08:45', check_out: '17:30', worked_hours: 8.75, day_status: 'present', sheet_status: 'confirmed'},
    {id: 3, date: '2026-03-10', check_in: null, check_out: null, worked_hours: 0, day_status: 'absent', sheet_status: 'confirmed'},
    {id: 4, date: '2026-03-09', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'done'},
    {id: 5, date: '2026-03-08', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'done'},
    {id: 6, date: '2026-03-07', check_in: '09:00', check_out: '18:00', worked_hours: 9.0, day_status: 'present', sheet_status: 'done'},
    {id: 7, date: '2026-03-06', check_in: '08:55', check_out: '17:20', worked_hours: 8.42, day_status: 'present', sheet_status: 'done'},
    {id: 8, date: '2026-03-05', check_in: null, check_out: null, worked_hours: 0, day_status: 'public_holiday', sheet_status: 'done'},
    {id: 9, date: '2026-03-04', check_in: '08:30', check_out: '17:00', worked_hours: 8.5, day_status: 'present', sheet_status: 'done'},
    {id: 10, date: '2026-03-03', check_in: null, check_out: null, worked_hours: 0, day_status: 'on_leave', sheet_status: 'done'},
  ],
  pagination: {page: 1, pageSize: 10, total: 30, totalPages: 3},
};
