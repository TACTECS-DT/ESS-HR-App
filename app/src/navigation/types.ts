/**
 * Type-safe React Navigation route definitions.
 * All screens and their params are declared here.
 *
 * Tab structure (matches wireframe):
 *   Home | Attendance | Leaves | Payslip | More
 */

export type AuthStackParamList = {
  LicenseActivation: undefined;
  CompanySelection: {companies: Array<{id: number; name: string; name_ar: string}>};
  Login: {companyId: number; companyName: string};
  PasswordReset: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  AttendanceTab: undefined;
  LeavesTab: undefined;
  PayslipTab: undefined;
  MoreTab: undefined;
};

// ─── Home Stack ───────────────────────────────────────────────
export type HomeStackParamList = {
  Home: undefined;
  Notifications: undefined;
  Announcements: undefined;
  Calendar: undefined;
  PendingApprovals: undefined;
};

// ─── Attendance Stack ─────────────────────────────────────────
export type AttendanceStackParamList = {
  AttendanceDashboard: undefined;
  AttendanceHistory: undefined;
  AttendanceDailySheet: {date: string};
  AttendanceMonthlySheet: {year: number; month: number};
  AttendanceTeam: undefined;
  AttendanceManualEntry: undefined;
};

// ─── Leaves Stack ─────────────────────────────────────────────
export type LeavesStackParamList = {
  LeaveList: undefined;
  LeaveCreate: undefined;
  LeaveDetail: {id: number};
  LeaveTeamBalance: undefined;
};

// ─── Payslip Stack ────────────────────────────────────────────
export type PayslipStackParamList = {
  PayslipList: undefined;
  PayslipDetail: {id: number};
};

// ─── More Stack ───────────────────────────────────────────────
// Houses: Expenses, Loans, Advance Salary, HR Letters,
//         Documents, Certs, Business Services,
//         Profile, Settings
export type MoreStackParamList = {
  MoreHub: undefined;
  // Expense
  ExpenseList: undefined;
  ExpenseCreate: undefined;
  ExpenseDetail: {id: number};
  // Loan
  LoanList: undefined;
  LoanCreate: undefined;
  LoanDetail: {id: number};
  // Advance Salary
  AdvanceSalaryList: undefined;
  AdvanceSalaryCreate: undefined;
  AdvanceSalaryDetail: {id: number};
  // HR Letters
  HRLetterList: undefined;
  HRLetterCreate: undefined;
  HRLetterDetail: {id: number};
  // Document Requests
  DocumentRequestList: undefined;
  DocumentRequestCreate: undefined;
  DocumentRequestDetail: {id: number};
  // Experience Certificates
  ExperienceCertList: undefined;
  ExperienceCertCreate: undefined;
  ExperienceCertDetail: {id: number};
  // Business Services
  BusinessServiceList: undefined;
  BusinessServiceCreate: undefined;
  BusinessServiceDetail: {id: number};
  // Tasks & Timesheets — disabled (re-enable when adapted to hr.employee context)
  // TaskList: undefined;
  // TaskDetail: {id: number};
  // LogTime: {taskId?: number; taskName?: string};
  // AddAttachment: {taskId?: number; taskName?: string};
  // TimesheetDaily: {date?: string};
  // TimesheetWeekly: undefined;
  // Timer: undefined;
  // TeamHours: undefined;
  // Personal & Analytics
  PersonalNotes: undefined;
  Analytics: undefined;
  // Profile & Settings
  Profile: {employeeId?: number; employeeName?: string} | undefined;
  EmployeeDirectory: undefined;
  Settings: undefined;
  // Chat
  ChatHR: undefined;
};

// ─── Root Navigator ───────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// kept for backward compat (RequestsHubScreen still imports this)
export type RequestsStackParamList = MoreStackParamList & {RequestsHub: undefined};

// Tasks/Timesheets disabled — alias kept so screen files compile without errors
export type TasksStackParamList = MoreStackParamList;
