/**
 * API Map — single source of truth for every API endpoint path.
 *
 * NEVER hardcode an API path anywhere in the app. Always import from here.
 *
 * ─── How the layers map ────────────────────────────────────────────────────
 *  Stage 1 │ MOCK_MODE=true  │ axios-mock-adapter intercepts these paths locally
 *  Stage 2 │ MOCK_MODE=false │ Point API_BASE_URL → Odoo; change paths below to /ess/api/...
 *  Stage 3 │ MOCK_MODE=false │ Point API_BASE_URL → Django; Django mirrors these REST paths
 * ──────────────────────────────────────────────────────────────────────────
 *
 * To switch backend layers:
 *   1. Update API_BASE_URL in src/config/env.ts
 *   2. If the new layer uses different path conventions (e.g. Odoo's /ess/api/*)
 *      update the string values below — the "Stage 2:" comments show the Odoo equivalents
 *   3. No other file in the app needs to change
 */

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Convert a path-function result (using 0 as the ID placeholder) into a regex
 * for use with axios-mock-adapter's dynamic route matching.
 *
 * @example
 *   pathToRegex(API_MAP.leave.requestById(0))
 *   // → /\/leave\/requests\/\d+/
 */
export function pathToRegex(path: string): RegExp {
  const pattern = path
    .replace(/\//g, '\\/')   // escape all slashes
    .replace('0', '\\d+');   // replace the first numeric placeholder with \d+
  return new RegExp(pattern);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const auth = {
  /**
   * Step 1 — Admin server validate (path only; caller must use ESS_ADMIN_URL as base).
   * POST /ess/admin/api/validate  body: { server_url }
   * Returns: { status, allowed_modules: [{name, code}], auto_logout_duration }
   */
  adminValidate: '/ess/admin/api/validate',
  /**
   * Step 2 setup — fetch companies from the CLIENT server after Step 1 succeeds.
   * GET /ess/api/auth/companies  (appended to serverUrl + /ess/api)
   */
  companies: '/auth/companies',
  /** Badge + PIN login. Stage 2: /ess/api/auth/badge-pin */
  login: '/auth/login',
  /** Refresh access token. */
  refresh: '/auth/refresh',
  /** Logout / end session. */
  logout: '/auth/logout',
  /** Resolve employee record by Odoo user ID. Stage 2: /ess/api/auth/by-user */
  byUser: '/auth/by-user',
} as const;

// ─── Employee ─────────────────────────────────────────────────────────────────
const employee = {
  /** Own profile, or another employee's by ?employee_id param. Stage 2: /ess/api/employee/profile */
  profile: '/profile',
  /** Employee directory list. Stage 2: /ess/api/employee/directory */
  directory: '/employees',
  /** Contract summary. Stage 2: /ess/api/employee/contract */
  contract: '/profile/contract',
} as const;

// ─── Attendance ───────────────────────────────────────────────────────────────
const attendance = {
  /** Today's check-in/out status. Stage 2: /ess/api/attendance/status */
  summary: '/attendance/summary',
  /** Check in. Stage 2: /ess/api/attendance/check-in */
  checkIn: '/attendance/check-in',
  /** Check out. Stage 2: /ess/api/attendance/check-out */
  checkOut: '/attendance/check-out',
  /** Attendance history (paginated). Stage 2: /ess/api/attendance/history */
  history: '/attendance/history',
  /** Team attendance view (manager). */
  team: '/attendance/team',
  /** Manual attendance entry (HR). */
  manual: '/attendance/manual',
  /** Daily attendance sheet for one date. Stage 2: /ess/api/attendance/daily-sheet */
  dailySheet: '/attendance/daily-sheet',
  /** Monthly attendance sheet for year + month. Stage 2: /ess/api/attendance/monthly-sheet */
  monthlySheet: '/attendance/monthly-sheet',
} as const;

// ─── Leave ────────────────────────────────────────────────────────────────────
const leave = {
  /** Available leave types. Stage 2: /ess/api/leave/types */
  types: '/leave/types',
  /** Employee leave balances. Stage 2: /ess/api/leave/balance */
  balances: '/leave/balances',
  /** Team leave balances (manager). Stage 2: /ess/api/leave/team-allocations */
  teamBalances: '/leave/team-balances',
  /** Leave request list (GET) + create new request (POST). Stage 2: /ess/api/leave/list | /ess/api/leave/create */
  requests: '/leave/requests',
  /** Single leave request by ID — update (PATCH) or cancel (DELETE). Stage 2: /ess/api/leave/update */
  requestById: (id: number) => `/leave/requests/${id}`,
  /** Approve leave (manager). Stage 2: /ess/api/leave/approve */
  approve: '/leave/approve',
  /** Refuse leave (manager). Stage 2: /ess/api/leave/refuse */
  refuse: '/leave/refuse',
  /** Validate leave (HR). Stage 2: /ess/api/leave/validate */
  validate: '/leave/validate',
  /** Reset leave to draft. Stage 2: /ess/api/leave/reset */
  reset: '/leave/reset',
} as const;

// ─── Payslip ──────────────────────────────────────────────────────────────────
const payslip = {
  /** Payslip list (optionally filtered by year/month). Stage 2: /ess/api/payslip/list */
  list: '/payslip',
  /** Single payslip by ID. Stage 2: /ess/api/payslip/detail */
  byId: (id: number) => `/payslip/${id}`,
  /** Download payslip as PDF (base64). Stage 2: /ess/api/payslip/pdf */
  pdf: '/payslip/pdf',
} as const;

// ─── Expense ──────────────────────────────────────────────────────────────────
const expense = {
  /** Expense product / category list. Stage 2: /ess/api/expense/categories */
  categories: '/expenses/categories',
  /** Currency list. Stage 2: /ess/api/expense/currencies */
  currencies: '/expenses/currencies',
  /** Purchase tax list. Stage 2: /ess/api/expense/taxes */
  taxes: '/expenses/taxes',
  /** Expense list (GET) + create expense (POST). Stage 2: /ess/api/expense/list | /ess/api/expense/create */
  expenses: '/expenses',
  /** Single expense by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/expense/update */
  byId: (id: number) => `/expenses/${id}`,
  /** Attach receipt (base64). Stage 2: /ess/api/expense/attach */
  attach: '/expenses/attach',
  /** Submit expense for approval. Stage 2: /ess/api/expense/submit */
  submit: '/expenses/submit',
} as const;

// ─── Loan ─────────────────────────────────────────────────────────────────────
const loan = {
  /** Loan policy and rules. Stage 2: /ess/api/loan/rules */
  rules: '/loans/rules',
  /** Loan list (GET) + create loan request (POST). Stage 2: /ess/api/loan/list | /ess/api/loan/create */
  loans: '/loans',
  /** Single loan by ID — update (PATCH). Stage 2: /ess/api/loan/detail */
  byId: (id: number) => `/loans/${id}`,
  /** Approve loan (manager). Stage 2: /ess/api/loan/approve */
  approve: '/loans/approve',
  /** Refuse loan (manager). Stage 2: /ess/api/loan/refuse */
  refuse: '/loans/refuse',
} as const;

// ─── Advance Salary ───────────────────────────────────────────────────────────
const advanceSalary = {
  /** Advance salary cap info for the employee. Stage 2: /ess/api/advance-salary/cap */
  info: '/advance-salary/info',
  /** Advance salary list (GET) + create request (POST). Stage 2: /ess/api/advance-salary/list */
  advances: '/advance-salary',
  /** Single advance salary by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/advance-salary/update */
  byId: (id: number) => `/advance-salary/${id}`,
  /** Approve request (manager). Stage 2: /ess/api/advance-salary/approve */
  approve: '/advance-salary/approve',
  /** Refuse request (manager). Stage 2: /ess/api/advance-salary/refuse */
  refuse: '/advance-salary/refuse',
  /** Reset to draft. Stage 2: /ess/api/advance-salary/reset */
  reset: '/advance-salary/reset',
} as const;

// ─── HR Letters ───────────────────────────────────────────────────────────────
const hrLetters = {
  /** HR letter list (GET) + create request (POST). Stage 2: /ess/api/hr-letters/list */
  letters: '/hr-letters',
  /** Single letter by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/hr-letters/update */
  byId: (id: number) => `/hr-letters/${id}`,
  /** Approve letter (manager). Stage 2: /ess/api/hr-letters/approve */
  approve: '/hr-letters/approve',
  /** Refuse letter (manager). Stage 2: /ess/api/hr-letters/refuse */
  refuse: '/hr-letters/refuse',
  /** Reset to draft. Stage 2: /ess/api/hr-letters/reset */
  reset: '/hr-letters/reset',
} as const;

// ─── Document Requests ────────────────────────────────────────────────────────
const documentRequests = {
  /** Available document types. Stage 2: /ess/api/documents/types */
  types: '/document-requests/types',
  /** Document request list (GET) + create request (POST). Stage 2: /ess/api/documents/list */
  requests: '/document-requests',
  /** Single document request by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/documents/update */
  byId: (id: number) => `/document-requests/${id}`,
  /** Approve request (manager). Stage 2: /ess/api/documents/approve */
  approve: '/document-requests/approve',
  /** Refuse request (manager). Stage 2: /ess/api/documents/refuse */
  refuse: '/document-requests/refuse',
  /** Reset to draft. Stage 2: /ess/api/documents/reset */
  reset: '/document-requests/reset',
} as const;

// ─── Experience Certificates ──────────────────────────────────────────────────
const certificates = {
  /** Certificate list (GET) + create request (POST). Stage 2: /ess/api/certificates/list */
  certificates: '/experience-certificates',
  /** Single certificate by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/certificates/update */
  byId: (id: number) => `/experience-certificates/${id}`,
  /** Approve. Stage 2: /ess/api/certificates/approve */
  approve: '/experience-certificates/approve',
  /** Refuse. Stage 2: /ess/api/certificates/refuse */
  refuse: '/experience-certificates/refuse',
  /** Reset. Stage 2: /ess/api/certificates/reset */
  reset: '/experience-certificates/reset',
} as const;

// ─── Business Services ────────────────────────────────────────────────────────
const businessServices = {
  /** Available business service types. Stage 2: /ess/api/business-services/types */
  types: '/business-services/types',
  /** Service request list (GET) + create request (POST). Stage 2: /ess/api/business-services/list */
  requests: '/business-services',
  /** Single service request by ID — update (PATCH) or delete (DELETE). Stage 2: /ess/api/business-services/update */
  byId: (id: number) => `/business-services/${id}`,
  /** Approve. Stage 2: /ess/api/business-services/approve */
  approve: '/business-services/approve',
  /** Refuse. Stage 2: /ess/api/business-services/refuse */
  refuse: '/business-services/refuse',
  /** Reset. Stage 2: /ess/api/business-services/reset */
  reset: '/business-services/reset',
} as const;

// ─── Tasks ────────────────────────────────────────────────────────────────────
const tasks = {
  /** Task list. Stage 2: /ess/api/tasks/list */
  list: '/tasks',
  /** Single task by ID — update stage (PATCH). Stage 2: /ess/api/tasks/update-stage */
  byId: (id: number) => `/tasks/${id}`,
  /** Task attachments list (GET) + add attachment (POST). Stage 2: /ess/api/tasks/attachments */
  attachments: (id: number) => `/tasks/${id}/attachments`,
} as const;

// ─── Timesheets ───────────────────────────────────────────────────────────────
const timesheets = {
  /** Timesheet list (GET) + log time (POST). Stage 2: /ess/api/timesheets/daily */
  timesheets: '/timesheets',
  /** Single timesheet entry by ID — update (PATCH) or delete (DELETE). */
  byId: (id: number) => `/timesheets/${id}`,
  /** Daily timesheet view. Stage 2: /ess/api/timesheets/daily */
  daily: '/timesheets/daily',
  /** Weekly timesheet view. Stage 2: /ess/api/timesheets/weekly */
  weekly: '/timesheets/weekly',
} as const;

// ─── Notifications ────────────────────────────────────────────────────────────
const notifications = {
  /** Notification list. */
  list: '/notifications',
  /** Mark a single notification as read. */
  markRead: (id: number) => `/notifications/${id}/read`,
  /** Mark all notifications as read. */
  markAllRead: '/notifications/read-all',
} as const;

// ─── Announcements ────────────────────────────────────────────────────────────
const announcements = {
  /** Announcement list (GET) + post new announcement (POST). */
  announcements: '/announcements',
} as const;

// ─── Pending Approvals ────────────────────────────────────────────────────────
const pendingApprovals = {
  /** All pending approvals for the current manager / HR user. */
  list: '/pending-approvals',
  /** Approve or refuse a pending item. */
  action: (id: number) => `/pending-approvals/${id}/action`,
} as const;

// ─── Personal Notes ───────────────────────────────────────────────────────────
const personalNotes = {
  /** Note list (GET) + create note (POST). */
  notes: '/personal-notes',
  /** Single note by ID — update (PATCH) or delete (DELETE). */
  byId: (id: number) => `/personal-notes/${id}`,
} as const;

// ─── Analytics ────────────────────────────────────────────────────────────────
const analytics = {
  /** Full analytics summary. Pass { params: { period } } as the request config. */
  summary: '/analytics',
  /** Per-module API usage stats. Stage 2: /ess/api/analytics/module-stats */
  moduleStats: '/analytics/module-stats',
  /** Per-employee activity. Stage 2: /ess/api/analytics/employee-activity */
  employeeActivity: '/analytics/employee-activity',
  /** Hourly request distribution. Stage 2: /ess/api/analytics/hourly-distribution */
  hourlyDistribution: '/analytics/hourly-distribution',
  /** Error summary. Stage 2: /ess/api/analytics/error-summary */
  errorSummary: '/analytics/error-summary',
  /** Daily request totals. Stage 2: /ess/api/analytics/daily-totals */
  dailyTotals: '/analytics/daily-totals',
} as const;

// ─── Team ─────────────────────────────────────────────────────────────────────
const team = {
  /** Team hours summary (manager). */
  hours: '/team-hours',
} as const;

// ─── Root export ──────────────────────────────────────────────────────────────
export const API_MAP = {
  auth,
  employee,
  attendance,
  leave,
  payslip,
  expense,
  loan,
  advanceSalary,
  hrLetters,
  documentRequests,
  certificates,
  businessServices,
  tasks,
  timesheets,
  notifications,
  announcements,
  pendingApprovals,
  personalNotes,
  analytics,
  team,
} as const;
