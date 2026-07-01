export type LeaveStatus = 'confirm' | 'validate1' | 'validate' | 'refuse' | 'cancel';
export type LeaveMode = 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly';

export interface LeaveType {
  id: number;
  name: string;
  name_ar: string;
  requires_attachment: boolean;
  requires_description: boolean;
  request_unit: 'day' | 'half_day' | 'hour';
  allows_half_day: boolean;
  allows_hourly: boolean;
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  leave_type_name_ar: string;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface ApprovalStep {
  step: number;
  approver: string;
  approver_ar: string;
  status: 'pending' | 'approved' | 'refused';
  date?: string;
  note?: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  leave_type: string;
  leave_type_ar: string;
  mode: LeaveMode;
  date_from: string;
  date_to: string;
  duration: number;
  status: LeaveStatus;
  description?: string;
  attachment?: string;
  approval_history: ApprovalStep[];
  created_at: string;
  can_approve?: boolean;
}

export type TeamMemberStatus = 'present' | 'absent' | 'on_leave' | 'pending';

export interface TeamMember {
  employee: string;
  employee_ar: string;
  status: TeamMemberStatus;
  checkin_time?: string;
  leave_info?: string;
  leave_info_ar?: string;
  balances: LeaveBalance[];
}
