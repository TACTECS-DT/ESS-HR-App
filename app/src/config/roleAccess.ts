/**
 * Role-Based Access Control — App Config
 *
 * Single source of truth for what each role can do.
 * Mirrors Odoo HR module permissions (see plan/ROLE_ACCESS.md for full reference).
 *
 * Role is returned by POST /auth/login → user.role
 * and stored in Redux: state.auth.user.role
 *
 * Usage:
 *   import { useRBAC } from '../hooks/useRBAC';
 *   const { canApproveLeave, canAccessAnalytics } = useRBAC();
 */

export type UserRole = 'employee' | 'manager' | 'hr' | 'admin';

/**
 * Which employees' records are returned by the API for this role.
 *  own          → only the logged-in user's records (employee_id == me)
 *  subordinates → own + direct/indirect subordinates (parent_id chain)
 *  all          → entire company dataset
 */
export type DataScope = 'own' | 'subordinates' | 'all';

export interface AppPermissions {
  // ── Data scopes (passed to API as query context) ────────────
  attendanceScope: DataScope;
  leaveScope: DataScope;
  /** NOTE: manager scope is intentionally 'own' — salary is confidential in Odoo */
  payslipScope: DataScope;
  expenseScope: DataScope;
  loanScope: DataScope;
  taskScope: DataScope;
  timesheetScope: DataScope;
  analyticsScope: DataScope;

  // ── Home dashboard ──────────────────────────────────────────
  canViewPendingApprovalsBadge: boolean;
  canViewTeamWidgets: boolean;

  // ── Attendance ──────────────────────────────────────────────
  canViewTeamAttendance: boolean;
  /** Manually create/edit attendance records for other employees (HR Officer only) */
  canManualEditAttendance: boolean;

  // ── Leave ───────────────────────────────────────────────────
  canViewTeamLeaveBalances: boolean;
  /** First-level approval (Manager) */
  canApproveLeave: boolean;
  canRefuseLeave: boolean;
  canResetLeave: boolean;
  canDeleteDraftLeave: boolean;
  /** Second-level / final validate (HR Officer) */
  canValidateLeave: boolean;

  // ── Expense ─────────────────────────────────────────────────
  canApproveExpense: boolean;
  canRefuseExpense: boolean;

  // ── Loan ────────────────────────────────────────────────────
  canApproveManagerLoan: boolean;   // first level
  canApproveHRLoan: boolean;        // second level
  canApproveCEOLoan: boolean;       // third level (admin only)
  canRefuseLoan: boolean;

  // ── Advance Salary ───────────────────────────────────────────
  canApproveAdvanceSalary: boolean;
  canRefuseAdvanceSalary: boolean;

  // ── HR Requests (letters, document requests, certificates) ───
  /** HR Officer is the sole approver for these request types */
  canApproveHRRequests: boolean;
  canRefuseHRRequests: boolean;

  // ── Business Services ─────────────────────────────────────────
  canApproveBusinessService: boolean;
  canRefuseBusinessService: boolean;

  // ── Pending Approvals screen ──────────────────────────────────
  canAccessPendingApprovals: boolean;

  // ── Manager/HR-only screens ────────────────────────────────────
  canAccessAnalytics: boolean;
  canAccessTeamHours: boolean;

  // ── Announcements ──────────────────────────────────────────────
  canCreateAnnouncements: boolean;

  // ── Tasks ──────────────────────────────────────────────────────
  canAssignTasks: boolean;

  // ── Profiles ───────────────────────────────────────────────────
  canViewOtherProfiles: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Permissions per role
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_ACCESS: Record<UserRole, AppPermissions> = {

  // ╔══════════════════════════════════╗
  // ║  EMPLOYEE                        ║
  // ║  Own records only                ║
  // ╚══════════════════════════════════╝
  employee: {
    attendanceScope:            'own',
    leaveScope:                 'own',
    payslipScope:               'own',
    expenseScope:               'own',
    loanScope:                  'own',
    taskScope:                  'own',
    timesheetScope:             'own',
    analyticsScope:             'own',

    canViewPendingApprovalsBadge: false,
    canViewTeamWidgets:           false,

    canViewTeamAttendance:        false,
    canManualEditAttendance:      false,

    canViewTeamLeaveBalances:     false,
    canApproveLeave:              false,
    canRefuseLeave:               false,
    canResetLeave:                true,   // own refused request only
    canDeleteDraftLeave:          true,
    canValidateLeave:             false,

    canApproveExpense:            false,
    canRefuseExpense:             false,

    canApproveManagerLoan:        false,
    canApproveHRLoan:             false,
    canApproveCEOLoan:            false,
    canRefuseLoan:                false,

    canApproveAdvanceSalary:      false,
    canRefuseAdvanceSalary:       false,

    canApproveHRRequests:         false,
    canRefuseHRRequests:          false,

    canApproveBusinessService:    false,
    canRefuseBusinessService:     false,

    canAccessPendingApprovals:    false,
    canAccessAnalytics:           false,
    canAccessTeamHours:           false,

    canAssignTasks:               false,
    canCreateAnnouncements:       false,
    canViewOtherProfiles:         false,
  },

  // ╔══════════════════════════════════╗
  // ║  MANAGER                         ║
  // ║  Own + subordinates              ║
  // ╚══════════════════════════════════╝
  manager: {
    attendanceScope:            'subordinates',
    leaveScope:                 'subordinates',
    payslipScope:               'own',          // salary is confidential — own only
    expenseScope:               'subordinates',
    loanScope:                  'subordinates',
    taskScope:                  'subordinates',
    timesheetScope:             'subordinates',
    analyticsScope:             'subordinates',

    canViewPendingApprovalsBadge: true,
    canViewTeamWidgets:           true,

    canViewTeamAttendance:        true,
    canManualEditAttendance:      false,         // requires HR Officer group in Odoo

    canViewTeamLeaveBalances:     true,
    canApproveLeave:              true,          // first-level
    canRefuseLeave:               true,
    canResetLeave:                true,
    canDeleteDraftLeave:          true,
    canValidateLeave:             false,         // second-level reserved for HR

    canApproveExpense:            true,          // first-level
    canRefuseExpense:             true,

    canApproveManagerLoan:        true,          // first-level
    canApproveHRLoan:             false,
    canApproveCEOLoan:            false,
    canRefuseLoan:                true,

    canApproveAdvanceSalary:      true,          // first-level
    canRefuseAdvanceSalary:       true,

    canApproveHRRequests:         false,         // HR letters/docs/certs → HR only
    canRefuseHRRequests:          false,

    canApproveBusinessService:    true,          // manager approves for their team
    canRefuseBusinessService:     true,

    canAccessPendingApprovals:    true,
    canAccessAnalytics:           true,
    canAccessTeamHours:           true,

    canAssignTasks:               true,          // manager can assign tasks to team
    canCreateAnnouncements:       false,
    canViewOtherProfiles:         false,
  },

  // ╔══════════════════════════════════╗
  // ║  HR                              ║
  // ║  All employees                   ║
  // ╚══════════════════════════════════╝
  hr: {
    attendanceScope:            'all',
    leaveScope:                 'all',
    payslipScope:               'all',
    expenseScope:               'all',
    loanScope:                  'all',
    taskScope:                  'own',           // HR is not a project manager
    timesheetScope:             'all',
    analyticsScope:             'all',

    canViewPendingApprovalsBadge: true,
    canViewTeamWidgets:           true,

    canViewTeamAttendance:        true,
    canManualEditAttendance:      true,          // HR Officer can fix records

    canViewTeamLeaveBalances:     true,
    canApproveLeave:              true,          // can step in at any level
    canRefuseLeave:               true,
    canResetLeave:                true,
    canDeleteDraftLeave:          true,
    canValidateLeave:             true,          // final validate

    canApproveExpense:            true,
    canRefuseExpense:             true,

    canApproveManagerLoan:        true,          // can step in
    canApproveHRLoan:             true,          // main role: HR-level approval
    canApproveCEOLoan:            false,         // CEO level = admin only
    canRefuseLoan:                true,

    canApproveAdvanceSalary:      true,
    canRefuseAdvanceSalary:       true,

    canApproveHRRequests:         true,          // letters, docs, certs — HR is sole approver
    canRefuseHRRequests:          true,

    canApproveBusinessService:    false,         // manager approval, not HR
    canRefuseBusinessService:     false,

    canAccessPendingApprovals:    true,
    canAccessAnalytics:           true,
    canAccessTeamHours:           true,

    canAssignTasks:               false,         // HR follows employee-level task access
    canCreateAnnouncements:       true,
    canViewOtherProfiles:         true,
  },

  // ╔══════════════════════════════════╗
  // ║  ADMIN                           ║
  // ║  All records, no restrictions    ║
  // ╚══════════════════════════════════╝
  admin: {
    attendanceScope:            'all',
    leaveScope:                 'all',
    payslipScope:               'all',
    expenseScope:               'all',
    loanScope:                  'all',
    taskScope:                  'all',
    timesheetScope:             'all',
    analyticsScope:             'all',

    canViewPendingApprovalsBadge: true,
    canViewTeamWidgets:           true,

    canViewTeamAttendance:        true,
    canManualEditAttendance:      true,

    canViewTeamLeaveBalances:     true,
    canApproveLeave:              true,
    canRefuseLeave:               true,
    canResetLeave:                true,
    canDeleteDraftLeave:          true,
    canValidateLeave:             true,

    canApproveExpense:            true,
    canRefuseExpense:             true,

    canApproveManagerLoan:        true,
    canApproveHRLoan:             true,
    canApproveCEOLoan:            true,          // admin acts as CEO approver
    canRefuseLoan:                true,

    canApproveAdvanceSalary:      true,
    canRefuseAdvanceSalary:       true,

    canApproveHRRequests:         true,
    canRefuseHRRequests:          true,

    canApproveBusinessService:    true,
    canRefuseBusinessService:     true,

    canAccessPendingApprovals:    true,
    canAccessAnalytics:           true,
    canAccessTeamHours:           true,

    canAssignTasks:               true,
    canCreateAnnouncements:       true,
    canViewOtherProfiles:         true,
  },
};
