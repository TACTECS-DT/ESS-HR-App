import {ApiSuccess} from '../../types/api';

// Exact Odoo 19 hr.leave state keys — sent as-is from the backend.
//   confirm   → To Approve       (submitted, awaiting manager)
//   validate1 → Second Approval  (first manager approved, awaiting second)
//   validate  → Approved         (fully approved)
//   refuse    → Refused
//   cancel    → Cancelled
export type LeaveStatus = 'confirm' | 'validate1' | 'validate' | 'refuse' | 'cancel';
export type LeaveMode = 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly';

export interface LeaveType {
  id: number;
  name: string;
  name_ar: string;
  requires_attachment: boolean;
  requires_description: boolean;
  /** Odoo hr.leave.type.request_unit — drives which input mode is shown */
  request_unit: 'day' | 'half_day' | 'hour';
  /** true when request_unit === 'half_day' */
  allows_half_day: boolean;
  /** true when request_unit === 'hour' */
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
}

export const MOCK_LEAVE_TYPES: ApiSuccess<LeaveType[]> = {
  success: true,
  data: [
    {id: 1, name: 'Annual Leave',   name_ar: 'إجازة سنوية',    requires_attachment: false, requires_description: false, request_unit: 'day',      allows_half_day: false, allows_hourly: false},
    {id: 2, name: 'Sick Leave',     name_ar: 'إجازة مرضية',   requires_attachment: true,  requires_description: true,  request_unit: 'half_day', allows_half_day: true,  allows_hourly: false},
    {id: 3, name: 'Emergency Leave',name_ar: 'إجازة طارئة',   requires_attachment: false, requires_description: true,  request_unit: 'day',      allows_half_day: false, allows_hourly: false},
    {id: 4, name: 'Unpaid Leave',   name_ar: 'إجازة بدون راتب',requires_attachment: false, requires_description: true,  request_unit: 'day',      allows_half_day: false, allows_hourly: false},
    {id: 5, name: 'Maternity Leave',name_ar: 'إجازة أمومة',   requires_attachment: true,  requires_description: false, request_unit: 'day',      allows_half_day: false, allows_hourly: false},
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

// All leave requests across all mock employees.
// employee_id values map to mock users:
//   100 = Employee (Ahmed Al-Farsi)
//   101 = Manager  (Khalid Al-Mansouri)
//   102 = HR       (Sara Al-Amin)
//   103 = Admin    (Omar Nasser)
export const ALL_LEAVE_REQUESTS: LeaveRequest[] = [
  // ── Employee (id=100) ──────────────────────────────────────
  {
    id: 201,
    employee_id: 100,
    employee: 'Ahmed Al-Farsi',
    employee_ar: 'أحمد الفارسي',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-03-15',
    date_to: '2026-03-17',
    duration: 3,
    status: 'confirm',                                         // To Approve
    approval_history: [
      {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'pending'},
    ],
    created_at: '2026-03-10',
  },
  {
    id: 202,
    employee_id: 100,
    employee: 'Ahmed Al-Farsi',
    employee_ar: 'أحمد الفارسي',
    leave_type: 'Sick Leave',
    leave_type_ar: 'إجازة مرضية',
    mode: 'full_day',
    date_from: '2026-02-20',
    date_to: '2026-02-20',
    duration: 1,
    status: 'validate',                                        // Approved (fully)
    description: 'Doctor appointment',
    approval_history: [
      {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'approved', date: '2026-02-18'},
      {step: 2, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-02-19'},
    ],
    created_at: '2026-02-17',
  },
  {
    id: 203,
    employee_id: 100,
    employee: 'Ahmed Al-Farsi',
    employee_ar: 'أحمد الفارسي',
    leave_type: 'Emergency Leave',
    leave_type_ar: 'إجازة طارئة',
    mode: 'full_day',
    date_from: '2026-01-10',
    date_to: '2026-01-10',
    duration: 1,
    status: 'refuse',                                          // Refused
    description: 'Family emergency',
    approval_history: [
      {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'refused', date: '2026-01-09', note: 'Critical project deadline'},
    ],
    created_at: '2026-01-08',
  },
  {
    id: 204,
    employee_id: 100,
    employee: 'Ahmed Al-Farsi',
    employee_ar: 'أحمد الفارسي',
    leave_type: 'Sick Leave',
    leave_type_ar: 'إجازة مرضية',
    mode: 'full_day',
    date_from: '2026-03-18',
    date_to: '2026-03-18',
    duration: 1,
    status: 'confirm',                                         // To Approve
    description: 'Not feeling well',
    approval_history: [
      {step: 1, approver: 'Manager', approver_ar: 'المدير', status: 'pending'},
    ],
    created_at: '2026-03-17',
  },
  // ── Manager's own leave (id=101) ───────────────────────────
  {
    id: 205,
    employee_id: 101,
    employee: 'Khalid Al-Mansouri',
    employee_ar: 'خالد المنصوري',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-04-05',
    date_to: '2026-04-09',
    duration: 5,
    status: 'validate',                                        // Approved (fully)
    approval_history: [
      {step: 1, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-03-20'},
    ],
    created_at: '2026-03-18',
  },
  {
    id: 206,
    employee_id: 101,
    employee: 'Khalid Al-Mansouri',
    employee_ar: 'خالد المنصوري',
    leave_type: 'Sick Leave',
    leave_type_ar: 'إجازة مرضية',
    mode: 'half_day_am',
    date_from: '2026-02-12',
    date_to: '2026-02-12',
    duration: 0.5,
    status: 'validate1',                                       // Second Approval (waiting for HR)
    description: 'Medical checkup',
    approval_history: [
      {step: 1, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-02-11'},
    ],
    created_at: '2026-02-10',
  },
  // ── Subordinate 1 — Fatima (visible to manager/hr/admin) ──
  {
    id: 207,
    employee_id: 110,
    employee: 'Fatima Al-Zahra',
    employee_ar: 'فاطمة الزهراء',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-03-22',
    date_to: '2026-03-26',
    duration: 5,
    status: 'confirm',                                         // To Approve
    approval_history: [
      {step: 1, approver: 'Khalid Al-Mansouri', approver_ar: 'خالد المنصوري', status: 'pending'},
    ],
    created_at: '2026-03-19',
  },
  {
    id: 208,
    employee_id: 110,
    employee: 'Fatima Al-Zahra',
    employee_ar: 'فاطمة الزهراء',
    leave_type: 'Emergency Leave',
    leave_type_ar: 'إجازة طارئة',
    mode: 'full_day',
    date_from: '2026-02-05',
    date_to: '2026-02-06',
    duration: 2,
    status: 'validate',                                        // Approved (fully)
    description: 'Family matter',
    approval_history: [
      {step: 1, approver: 'Khalid Al-Mansouri', approver_ar: 'خالد المنصوري', status: 'approved', date: '2026-02-04'},
      {step: 2, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-02-04'},
    ],
    created_at: '2026-02-03',
  },
  // ── Subordinate 2 — Omar (visible to manager/hr/admin) ────
  {
    id: 209,
    employee_id: 111,
    employee: 'Omar Al-Rashid',
    employee_ar: 'عمر الراشد',
    leave_type: 'Unpaid Leave',
    leave_type_ar: 'إجازة بدون راتب',
    mode: 'full_day',
    date_from: '2026-03-10',
    date_to: '2026-03-14',
    duration: 5,
    status: 'validate',                                        // Approved (fully)
    description: 'Personal reasons',
    approval_history: [
      {step: 1, approver: 'Khalid Al-Mansouri', approver_ar: 'خالد المنصوري', status: 'approved', date: '2026-03-08'},
      {step: 2, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-03-09'},
    ],
    created_at: '2026-03-07',
  },
  {
    id: 210,
    employee_id: 111,
    employee: 'Omar Al-Rashid',
    employee_ar: 'عمر الراشد',
    leave_type: 'Sick Leave',
    leave_type_ar: 'إجازة مرضية',
    mode: 'full_day',
    date_from: '2026-01-20',
    date_to: '2026-01-21',
    duration: 2,
    status: 'refuse',                                          // Refused
    description: 'Cold',
    approval_history: [
      {step: 1, approver: 'Khalid Al-Mansouri', approver_ar: 'خالد المنصوري', status: 'refused', date: '2026-01-19', note: 'Insufficient documentation'},
    ],
    created_at: '2026-01-18',
  },
  // ── Subordinate 3 — Noor (confirm — needs manager approval) ──
  {
    id: 211,
    employee_id: 112,
    employee: 'Noor Mohamed',
    employee_ar: 'نور محمد',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-03-28',
    date_to: '2026-04-01',
    duration: 5,
    status: 'confirm',                                         // To Approve
    approval_history: [
      {step: 1, approver: 'Khalid Al-Mansouri', approver_ar: 'خالد المنصوري', status: 'pending'},
    ],
    created_at: '2026-03-21',
  },
  // ── HR's own leave (id=102) ────────────────────────────────
  {
    id: 212,
    employee_id: 102,
    employee: 'Sara Al-Amin',
    employee_ar: 'سارة الأمين',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-05-01',
    date_to: '2026-05-05',
    duration: 5,
    status: 'confirm',                                         // To Approve
    approval_history: [
      {step: 1, approver: 'HR Manager', approver_ar: 'مدير الموارد البشرية', status: 'pending'},
    ],
    created_at: '2026-03-22',
  },
  // ── Admin's own leave (id=103) ─────────────────────────────
  {
    id: 213,
    employee_id: 103,
    employee: 'Omar Nasser',
    employee_ar: 'عمر ناصر',
    leave_type: 'Annual Leave',
    leave_type_ar: 'إجازة سنوية',
    mode: 'full_day',
    date_from: '2026-06-15',
    date_to: '2026-06-19',
    duration: 5,
    status: 'validate',                                        // Approved (fully)
    approval_history: [
      {step: 1, approver: 'HR', approver_ar: 'الموارد البشرية', status: 'approved', date: '2026-03-15'},
    ],
    created_at: '2026-03-14',
  },
];

// Scope-filtered views used by the mock handler:
//   employee  → own records only (employee_id = 100)
//   manager   → own + subordinates (ids 100, 101, 110, 111, 112)
//   hr/admin  → all records
export const MOCK_LEAVE_REQUESTS: ApiSuccess<LeaveRequest[]> = {
  success: true,
  data: ALL_LEAVE_REQUESTS,
  pagination: {page: 1, pageSize: 20, total: ALL_LEAVE_REQUESTS.length, totalPages: 1},
};

// employee_ids visible to each role
const EMPLOYEE_OWN = [100];
const MANAGER_SCOPE = [100, 101, 110, 111, 112]; // own + subordinates

export function getLeaveRequestsForRole(role: string): LeaveRequest[] {
  if (role === 'employee') {
    return ALL_LEAVE_REQUESTS.filter(r => EMPLOYEE_OWN.includes(r.employee_id));
  }
  if (role === 'manager') {
    return ALL_LEAVE_REQUESTS.filter(r => MANAGER_SCOPE.includes(r.employee_id));
  }
  // hr and admin see everything
  return ALL_LEAVE_REQUESTS;
}

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
