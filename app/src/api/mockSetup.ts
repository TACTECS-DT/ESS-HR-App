/**
 * Mock adapter setup.
 * Registers all mock endpoints when MOCK_MODE = true.
 * Import and call setupMocks() once at app startup (in index.js or App.tsx).
 */
import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';
import {ENV} from '../config/env';
import {API_MAP, pathToRegex} from './apiMap';

// Mock data
import {
  MOCK_LICENSE_VALID,
  MOCK_LICENSE_INVALID,
  MOCK_LOGIN_SUCCESS,
  MOCK_LOGIN_INVALID,
  MOCK_REFRESH_SUCCESS,
  MOCK_USERS_BY_BADGE,
  mockLoginAs,
} from './mocks/auth.mock';
import {
  MOCK_ATTENDANCE_SUMMARY,
  MOCK_CHECK_IN,
  MOCK_CHECK_OUT,
  MOCK_ATTENDANCE_HISTORY,
  MOCK_TEAM_ATTENDANCE,
} from './mocks/attendance.mock';
import {
  MOCK_LEAVE_TYPES,
  MOCK_LEAVE_BALANCES,
  MOCK_LEAVE_CREATE_SUCCESS,
  MOCK_TEAM_LEAVE_BALANCES,
  getLeaveRequestsForRole,
} from './mocks/leave.mock';
import {MOCK_PAYSLIP_LIST} from './mocks/payslip.mock';
import {
  MOCK_EXPENSE_CATEGORIES,
  MOCK_EXPENSES,
  MOCK_EXPENSE_CREATE_SUCCESS,
} from './mocks/expense.mock';
import {
  MOCK_LOAN_RULES,
  MOCK_LOANS,
  MOCK_LOAN_CREATE_SUCCESS,
} from './mocks/loan.mock';
import {
  MOCK_ADVANCE_SALARY_INFO,
  MOCK_ADVANCE_SALARIES,
  MOCK_ADVANCE_SALARY_CREATE_SUCCESS,
} from './mocks/advance-salary.mock';
import {
  MOCK_HR_LETTERS,
  MOCK_HR_LETTER_CREATE_SUCCESS,
} from './mocks/hr-letters.mock';
import {
  MOCK_DOCUMENT_TYPES,
  MOCK_DOCUMENT_REQUESTS,
  MOCK_DOCUMENT_REQUEST_CREATE_SUCCESS,
} from './mocks/document-requests.mock';
import {
  MOCK_EXPERIENCE_CERTIFICATES,
  MOCK_CERTIFICATE_CREATE_SUCCESS,
} from './mocks/experience-certificates.mock';
import {
  MOCK_SERVICE_TYPES,
  MOCK_BUSINESS_SERVICES,
  MOCK_SERVICE_CREATE_SUCCESS,
} from './mocks/business-services.mock';
import {MOCK_TASKS} from './mocks/tasks.mock';
import {MOCK_TIMESHEETS, MOCK_LOG_TIME_SUCCESS} from './mocks/timesheets.mock';
import {MOCK_PROFILE, MOCK_EMPLOYEES, MOCK_PROFILES_BY_ID} from './mocks/profile.mock';
import {MOCK_NOTIFICATIONS} from './mocks/notifications.mock';
import {MOCK_ANNOUNCEMENTS} from './mocks/announcements.mock';
import {MOCK_PENDING_APPROVALS, MOCK_APPROVAL_ACTION_SUCCESS} from './mocks/pending-approvals.mock';
import {MOCK_PERSONAL_NOTES, MOCK_NOTE_CREATE_SUCCESS} from './mocks/personal-notes.mock';
import {MOCK_ANALYTICS} from './mocks/analytics.mock';
import {MOCK_TEAM_HOURS} from './mocks/team-hours.mock';

function randomDelay(): number {
  return (
    Math.floor(Math.random() * (ENV.MOCK_DELAY_MAX - ENV.MOCK_DELAY_MIN + 1)) +
    ENV.MOCK_DELAY_MIN
  );
}

let mockInstance: MockAdapter | null = null;

// Tracks the role of the currently logged-in mock user so handlers can scope data.
let currentRole = 'employee';

export function setupMocks(): void {
  if (!ENV.MOCK_MODE) {
    return;
  }

  mockInstance = new MockAdapter(apiClient, {delayResponse: randomDelay()});

  // ─── Auth ───────────────────────────────────────────────────────────────
  mockInstance.onPost(API_MAP.auth.validateLicense).reply(config => {
    const body = JSON.parse(config.data as string);
    if (body.license_key === 'INVALID') {
      return [400, MOCK_LICENSE_INVALID];
    }
    return [200, MOCK_LICENSE_VALID];
  });

  mockInstance.onPost(API_MAP.auth.login).reply(config => {
    const body = JSON.parse(config.data as string);
    if (body.pin === '0000' || body.password === 'wrong') {
      return [401, MOCK_LOGIN_INVALID];
    }
    // Route to the correct mock user by badge_id so each role can be tested
    const badgeId: string | undefined = body.badge_id;
    const matchedUser = badgeId ? MOCK_USERS_BY_BADGE[badgeId] : undefined;
    const loggedInUser = matchedUser ?? MOCK_LOGIN_SUCCESS.data.user;
    currentRole = loggedInUser.role;
    return [200, matchedUser ? mockLoginAs(matchedUser) : MOCK_LOGIN_SUCCESS];
  });

  mockInstance.onPost(API_MAP.auth.refresh).reply(200, MOCK_REFRESH_SUCCESS);
  mockInstance.onPost(API_MAP.auth.logout).reply(200, {success: true});

  // ─── Attendance ─────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.attendance.summary).reply(200, MOCK_ATTENDANCE_SUMMARY);
  mockInstance.onPost(API_MAP.attendance.checkIn).reply(200, MOCK_CHECK_IN);
  mockInstance.onPost(API_MAP.attendance.checkOut).reply(200, MOCK_CHECK_OUT);
  mockInstance.onGet(API_MAP.attendance.history).reply(200, MOCK_ATTENDANCE_HISTORY);
  mockInstance.onGet(API_MAP.attendance.team).reply(200, MOCK_TEAM_ATTENDANCE);
  mockInstance.onPost(API_MAP.attendance.manual).reply(201, {success: true, data: null});

  // ─── Leave ──────────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.leave.types).reply(200, MOCK_LEAVE_TYPES);
  mockInstance.onGet(API_MAP.leave.balances).reply(200, MOCK_LEAVE_BALANCES);
  mockInstance.onGet(API_MAP.leave.requests).reply(() => {
    const data = getLeaveRequestsForRole(currentRole);
    return [200, {success: true, data, pagination: {page: 1, pageSize: 20, total: data.length, totalPages: 1}}];
  });
  mockInstance.onPost(API_MAP.leave.requests).reply(201, MOCK_LEAVE_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.leave.requestById(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.leave.requestById(0))).reply(200, {success: true, data: null});
  mockInstance.onGet(API_MAP.leave.teamBalances).reply(200, MOCK_TEAM_LEAVE_BALANCES);

  // ─── Payslip ────────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.payslip.list).reply(200, MOCK_PAYSLIP_LIST);
  mockInstance.onGet(pathToRegex(API_MAP.payslip.byId(0))).reply(config => {
    const id = Number(config.url?.split('/').pop());
    const found = MOCK_PAYSLIP_LIST.data.find(p => p.id === id);
    if (found) {
      return [200, {success: true, data: found}];
    }
    return [404, {success: false, error: {code: 'NOT_FOUND', message: 'Payslip not found', message_ar: 'لم يتم العثور على قسيمة الراتب'}}];
  });

  // ─── Expenses ───────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.expense.categories).reply(200, MOCK_EXPENSE_CATEGORIES);
  mockInstance.onGet(API_MAP.expense.expenses).reply(200, MOCK_EXPENSES);
  mockInstance.onPost(API_MAP.expense.expenses).reply(201, MOCK_EXPENSE_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.expense.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.expense.byId(0))).reply(200, {success: true, data: null});

  // ─── Loans ──────────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.loan.rules).reply(200, MOCK_LOAN_RULES);
  mockInstance.onGet(API_MAP.loan.loans).reply(200, MOCK_LOANS);
  mockInstance.onPost(API_MAP.loan.loans).reply(201, MOCK_LOAN_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.loan.byId(0))).reply(200, {success: true, data: null});

  // ─── Advance Salary ─────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.advanceSalary.info).reply(200, MOCK_ADVANCE_SALARY_INFO);
  mockInstance.onGet(API_MAP.advanceSalary.advances).reply(200, MOCK_ADVANCE_SALARIES);
  mockInstance.onPost(API_MAP.advanceSalary.advances).reply(201, MOCK_ADVANCE_SALARY_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.advanceSalary.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.advanceSalary.byId(0))).reply(200, {success: true, data: null});

  // ─── HR Letters ─────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.hrLetters.letters).reply(200, MOCK_HR_LETTERS);
  mockInstance.onPost(API_MAP.hrLetters.letters).reply(201, MOCK_HR_LETTER_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.hrLetters.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.hrLetters.byId(0))).reply(200, {success: true, data: null});

  // ─── Document Requests ──────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.documentRequests.types).reply(200, MOCK_DOCUMENT_TYPES);
  mockInstance.onGet(API_MAP.documentRequests.requests).reply(200, MOCK_DOCUMENT_REQUESTS);
  mockInstance.onPost(API_MAP.documentRequests.requests).reply(201, MOCK_DOCUMENT_REQUEST_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.documentRequests.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.documentRequests.byId(0))).reply(200, {success: true, data: null});

  // ─── Experience Certificates ────────────────────────────────────────────
  mockInstance.onGet(API_MAP.certificates.certificates).reply(200, MOCK_EXPERIENCE_CERTIFICATES);
  mockInstance.onPost(API_MAP.certificates.certificates).reply(201, MOCK_CERTIFICATE_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.certificates.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.certificates.byId(0))).reply(200, {success: true, data: null});

  // ─── Business Services ──────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.businessServices.types).reply(200, MOCK_SERVICE_TYPES);
  mockInstance.onGet(API_MAP.businessServices.requests).reply(200, MOCK_BUSINESS_SERVICES);
  mockInstance.onPost(API_MAP.businessServices.requests).reply(201, MOCK_SERVICE_CREATE_SUCCESS);

  // ─── Tasks ──────────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.tasks.list).reply(200, MOCK_TASKS);
  mockInstance.onPatch(pathToRegex(API_MAP.tasks.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onPost(pathToRegex(API_MAP.tasks.attachments(0))).reply(200, {success: true, data: null});

  // ─── Timesheets ─────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.timesheets.timesheets).reply(200, MOCK_TIMESHEETS);
  mockInstance.onPost(API_MAP.timesheets.timesheets).reply(201, MOCK_LOG_TIME_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.timesheets.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.timesheets.byId(0))).reply(200, {success: true, data: null});

  // ─── Employee / Profile ─────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.employee.profile).reply(config => {
    const employeeId = config.params?.employee_id;
    if (employeeId && MOCK_PROFILES_BY_ID[employeeId]) {
      return [200, {success: true, data: MOCK_PROFILES_BY_ID[employeeId]}];
    }
    return [200, MOCK_PROFILE];
  });
  mockInstance.onGet(API_MAP.employee.directory).reply(200, MOCK_EMPLOYEES);

  // ─── Notifications ──────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.notifications.list).reply(200, MOCK_NOTIFICATIONS);
  mockInstance.onPatch(pathToRegex(API_MAP.notifications.markRead(0))).reply(200, {success: true, data: null});
  mockInstance.onPost(API_MAP.notifications.markAllRead).reply(200, {success: true, data: null});

  // ─── Announcements ──────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.announcements.announcements).reply(200, MOCK_ANNOUNCEMENTS);
  mockInstance.onPost(API_MAP.announcements.announcements).reply(201, {success: true, data: null});

  // ─── Pending Approvals ──────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.pendingApprovals.list).reply(200, MOCK_PENDING_APPROVALS);
  mockInstance.onPost(pathToRegex(API_MAP.pendingApprovals.action(0))).reply(200, MOCK_APPROVAL_ACTION_SUCCESS);

  // ─── Personal Notes ─────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.personalNotes.notes).reply(200, MOCK_PERSONAL_NOTES);
  mockInstance.onPost(API_MAP.personalNotes.notes).reply(201, MOCK_NOTE_CREATE_SUCCESS);
  mockInstance.onPatch(pathToRegex(API_MAP.personalNotes.byId(0))).reply(200, {success: true, data: null});
  mockInstance.onDelete(pathToRegex(API_MAP.personalNotes.byId(0))).reply(200, {success: true, data: null});

  // ─── Analytics ──────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.analytics.summary).reply(200, MOCK_ANALYTICS);

  // ─── Team Hours ─────────────────────────────────────────────────────────
  mockInstance.onGet(API_MAP.team.hours).reply(200, MOCK_TEAM_HOURS);
}

export function teardownMocks(): void {
  mockInstance?.restore();
  mockInstance = null;
}
