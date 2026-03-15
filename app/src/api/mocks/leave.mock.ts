import {ApiSuccess} from '../../types/api';

export type LeaveStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'validated';
export type LeaveMode = 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly';

export interface LeaveType {
  id: number;
  name: string;
  name_ar: string;
  requires_attachment: boolean;
  requires_description: boolean;
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
}

export const MOCK_LEAVE_TYPES: ApiSuccess<LeaveType[]> = {
  success: true,
  data: [
    {id: 1, name: 'Annual Leave', name_ar: 'إجازة سنوية', requires_attachment: false, requires_description: false, allows_half_day: true, allows_hourly: false},
    {id: 2, name: 'Sick Leave', name_ar: 'إجازة مرضية', requires_attachment: true, requires_description: true, allows_half_day: true, allows_hourly: false},
    {id: 3, name: 'Emergency Leave', name_ar: 'إجازة طارئة', requires_attachment: false, requires_description: true, allows_half_day: false, allows_hourly: false},
    {id: 4, name: 'Unpaid Leave', name_ar: 'إجازة بدون راتب', requires_attachment: false, requires_description: true, allows_half_day: false, allows_hourly: false},
    {id: 5, name: 'Maternity Leave', name_ar: 'إجازة أمومة', requires_attachment: true, requires_description: false, allows_half_day: false, allows_hourly: false},
  ],
};

export const MOCK_LEAVE_BALANCES: ApiSuccess<LeaveBalance[]> = {
  success: true,
  data: [
    {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 5, pending: 2, remaining: 14},
    {leave_type_id: 2, leave_type_name: 'Sick Leave', leave_type_name_ar: 'إجازة مرضية', allocated: 14, used: 1, pending: 0, remaining: 13},
    {leave_type_id: 3, leave_type_name: 'Emergency Leave', leave_type_name_ar: 'إجازة طارئة', allocated: 5, used: 0, pending: 0, remaining: 5},
  ],
};

export const MOCK_LEAVE_REQUESTS: ApiSuccess<LeaveRequest[]> = {
  success: true,
  data: [
    {
      id: 201,
      leave_type: 'Annual Leave',
      leave_type_ar: 'إجازة سنوية',
      mode: 'full_day',
      date_from: '2026-03-15',
      date_to: '2026-03-17',
      duration: 3,
      status: 'pending',
      approval_history: [
        {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'pending'},
      ],
      created_at: '2026-03-10',
    },
    {
      id: 202,
      leave_type: 'Sick Leave',
      leave_type_ar: 'إجازة مرضية',
      mode: 'full_day',
      date_from: '2026-02-20',
      date_to: '2026-02-20',
      duration: 1,
      status: 'approved',
      description: 'Doctor appointment',
      approval_history: [
        {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'approved', date: '2026-02-18'},
        {step: 2, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-02-19'},
      ],
      created_at: '2026-02-17',
    },
    {
      id: 203,
      leave_type: 'Emergency Leave',
      leave_type_ar: 'إجازة طارئة',
      mode: 'full_day',
      date_from: '2026-01-10',
      date_to: '2026-01-10',
      duration: 1,
      status: 'refused',
      description: 'Family emergency',
      approval_history: [
        {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'refused', date: '2026-01-09', note: 'Critical project deadline'},
      ],
      created_at: '2026-01-08',
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 3, totalPages: 1},
};

export const MOCK_LEAVE_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 204},
  message: 'Leave request submitted successfully.',
};

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

export const MOCK_TEAM_LEAVE_BALANCES: ApiSuccess<TeamMember[]> = {
  success: true,
  data: [
    {
      employee: 'Ahmed Hassan',
      employee_ar: 'أحمد حسن',
      status: 'present',
      checkin_time: '08:55 AM',
      balances: [
        {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 5, pending: 0, remaining: 16},
      ],
    },
    {
      employee: 'Fatima Khalil',
      employee_ar: 'فاطمة خليل',
      status: 'present',
      checkin_time: '09:00 AM',
      balances: [
        {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 7, pending: 0, remaining: 14},
      ],
    },
    {
      employee: 'Omar Al-Rashid',
      employee_ar: 'عمر الراشد',
      status: 'on_leave',
      leave_info: 'Annual Leave (Mar 10–12)',
      leave_info_ar: 'إجازة سنوية (١٠-١٢ مارس)',
      balances: [
        {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 3, pending: 0, remaining: 18},
      ],
    },
    {
      employee: 'Noor Mohamed',
      employee_ar: 'نور محمد',
      status: 'absent',
      balances: [
        {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 2, pending: 0, remaining: 19},
      ],
    },
    {
      employee: 'Sara Khalid',
      employee_ar: 'سارة خالد',
      status: 'pending',
      leave_info: 'Leave request pending approval',
      leave_info_ar: 'طلب إجازة قيد الموافقة',
      balances: [
        {leave_type_id: 1, leave_type_name: 'Annual Leave', leave_type_name_ar: 'إجازة سنوية', allocated: 21, used: 7, pending: 2, remaining: 12},
      ],
    },
  ],
};
