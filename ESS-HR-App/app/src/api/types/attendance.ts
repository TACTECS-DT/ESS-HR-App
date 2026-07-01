export interface TeamAttendanceRecord {
  employee_id: number;
  employee_name: string;
  employee_name_ar: string;
  badge_id: string;
  department: string;
  department_ar: string;
  status: 'checked_in' | 'checked_out' | 'absent';
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
}

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
  gps_latitude?: number;    // maps to Odoo standard field: latitude
  gps_longitude?: number;   // maps to Odoo standard field: longitude
  checkout_latitude?: number;  // maps to Odoo standard field: out_latitude
  checkout_longitude?: number; // maps to Odoo standard field: out_longitude
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
