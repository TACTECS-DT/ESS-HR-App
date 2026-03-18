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
  hours_worked_this_month: number;
  absences_this_month: number;
}

export const MOCK_ATTENDANCE_SUMMARY: ApiSuccess<AttendanceSummary> = {
  success: true,
  data: {
    status: 'checked_in',
    check_in_time: '08:32',
    hours_worked_today: 3.5,
    hours_worked_this_month: 118,
    absences_this_month: 1,
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
    // Week of Mar 16-18 (current week, Mon-Wed)
    {id: 18, date: '2026-03-18', check_in: '08:32', check_out: null, worked_hours: 3.5, day_status: 'present', sheet_status: 'draft', location_in: {lat: 24.7136, lng: 46.6753}},
    {id: 17, date: '2026-03-17', check_in: '08:40', check_out: '17:10', worked_hours: 8.5, day_status: 'present', sheet_status: 'draft'},
    {id: 16, date: '2026-03-16', check_in: '08:55', check_out: '17:30', worked_hours: 8.58, day_status: 'present', sheet_status: 'draft', location_in: {lat: 24.7136, lng: 46.6753}},
    // Weekend Mar 14-15 (Fri-Sat in MENA)
    {id: 15, date: '2026-03-15', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'confirmed'},
    {id: 14, date: '2026-03-14', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'confirmed'},
    // Week of Mar 9-13
    {id: 13, date: '2026-03-13', check_in: '08:20', check_out: '17:00', worked_hours: 8.67, day_status: 'present', sheet_status: 'confirmed'},
    {id: 12, date: '2026-03-12', check_in: '08:32', check_out: '17:15', worked_hours: 8.72, day_status: 'present', sheet_status: 'confirmed'},
    {id: 11, date: '2026-03-11', check_in: '08:45', check_out: '17:30', worked_hours: 8.75, day_status: 'present', sheet_status: 'confirmed'},
    {id: 10, date: '2026-03-10', check_in: null, check_out: null, worked_hours: 0, day_status: 'absent', sheet_status: 'confirmed'},
    {id: 9, date: '2026-03-09', check_in: '09:05', check_out: '17:45', worked_hours: 8.67, day_status: 'present', sheet_status: 'confirmed'},
    // Weekend Mar 7-8
    {id: 8, date: '2026-03-08', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'done'},
    {id: 7, date: '2026-03-07', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'done'},
    // Week of Mar 2-6
    {id: 6, date: '2026-03-06', check_in: '09:00', check_out: '18:00', worked_hours: 9.0, day_status: 'present', sheet_status: 'done'},
    {id: 5, date: '2026-03-05', check_in: null, check_out: null, worked_hours: 0, day_status: 'public_holiday', sheet_status: 'done'},
    {id: 4, date: '2026-03-04', check_in: '08:55', check_out: '17:20', worked_hours: 8.42, day_status: 'present', sheet_status: 'done'},
    {id: 3, date: '2026-03-03', check_in: '08:30', check_out: '17:00', worked_hours: 8.5, day_status: 'present', sheet_status: 'done'},
    {id: 2, date: '2026-03-02', check_in: null, check_out: null, worked_hours: 0, day_status: 'on_leave', sheet_status: 'done'},
    // Weekend Mar 1 (Sun)
    {id: 1, date: '2026-03-01', check_in: null, check_out: null, worked_hours: 0, day_status: 'weekend', sheet_status: 'done'},
  ],
  pagination: {page: 1, pageSize: 18, total: 18, totalPages: 1},
};
