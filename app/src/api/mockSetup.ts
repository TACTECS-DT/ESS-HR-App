/**
 * Mock adapter setup.
 * Registers all mock endpoints when MOCK_MODE = true.
 * Import and call setupMocks() once at app startup (in index.js or App.tsx).
 */
import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';
import {ENV} from '../config/env';

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

  // ─── Auth ───────────────────────────────────────────────────
  mockInstance.onPost('/auth/validate-license').reply(config => {
    const body = JSON.parse(config.data as string);
    if (body.license_key === 'INVALID') {
      return [400, MOCK_LICENSE_INVALID];
    }
    return [200, MOCK_LICENSE_VALID];
  });

  mockInstance.onPost('/auth/login').reply(config => {
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

  mockInstance.onPost('/auth/refresh').reply(200, MOCK_REFRESH_SUCCESS);
  mockInstance.onPost('/auth/logout').reply(200, {success: true});

  // ─── Attendance ──────────────────────────────────────────────
  mockInstance.onGet('/attendance/summary').reply(200, MOCK_ATTENDANCE_SUMMARY);
  mockInstance.onPost('/attendance/check-in').reply(200, MOCK_CHECK_IN);
  mockInstance.onPost('/attendance/check-out').reply(200, MOCK_CHECK_OUT);
  mockInstance.onGet('/attendance/history').reply(200, MOCK_ATTENDANCE_HISTORY);
  mockInstance.onGet('/attendance/team').reply(200, MOCK_TEAM_ATTENDANCE);
  mockInstance.onPost('/attendance/manual').reply(201, {success: true, data: null});

  // ─── Leave ───────────────────────────────────────────────────
  mockInstance.onGet('/leave/types').reply(200, MOCK_LEAVE_TYPES);
  mockInstance.onGet('/leave/balances').reply(200, MOCK_LEAVE_BALANCES);
  mockInstance.onGet('/leave/requests').reply(() => {
    const data = getLeaveRequestsForRole(currentRole);
    return [200, {success: true, data, pagination: {page: 1, pageSize: 20, total: data.length, totalPages: 1}}];
  });
  mockInstance.onPost('/leave/requests').reply(201, MOCK_LEAVE_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/leave/requests/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/leave/requests/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onGet('/leave/team-balances').reply(200, MOCK_TEAM_LEAVE_BALANCES);

  // ─── Payslip ─────────────────────────────────────────────────
  mockInstance.onGet('/payslip').reply(200, MOCK_PAYSLIP_LIST);
  mockInstance.onGet(new RegExp('/payslip/\\d+')).reply(config => {
    const id = Number(config.url?.split('/').pop());
    const found = MOCK_PAYSLIP_LIST.data.find(p => p.id === id);
    if (found) {
      return [200, {success: true, data: found}];
    }
    return [404, {success: false, error: {code: 'NOT_FOUND', message: 'Payslip not found', message_ar: 'لم يتم العثور على قسيمة الراتب'}}];
  });

  // ─── Expenses ────────────────────────────────────────────────
  mockInstance.onGet('/expenses/categories').reply(200, MOCK_EXPENSE_CATEGORIES);
  mockInstance.onGet('/expenses').reply(200, MOCK_EXPENSES);
  mockInstance.onPost('/expenses').reply(201, MOCK_EXPENSE_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/expenses/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/expenses/\\d+')).reply(200, {success: true, data: null});

  // ─── Loans ───────────────────────────────────────────────────
  mockInstance.onGet('/loans/rules').reply(200, MOCK_LOAN_RULES);
  mockInstance.onGet('/loans').reply(200, MOCK_LOANS);
  mockInstance.onPost('/loans').reply(201, MOCK_LOAN_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/loans/\\d+')).reply(200, {success: true, data: null});

  // ─── Advance Salary ──────────────────────────────────────────
  mockInstance.onGet('/advance-salary/info').reply(200, MOCK_ADVANCE_SALARY_INFO);
  mockInstance.onGet('/advance-salary').reply(200, MOCK_ADVANCE_SALARIES);
  mockInstance.onPost('/advance-salary').reply(201, MOCK_ADVANCE_SALARY_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/advance-salary/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/advance-salary/\\d+')).reply(200, {success: true, data: null});

  // ─── HR Letters ──────────────────────────────────────────────
  mockInstance.onGet('/hr-letters').reply(200, MOCK_HR_LETTERS);
  mockInstance.onPost('/hr-letters').reply(201, MOCK_HR_LETTER_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/hr-letters/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/hr-letters/\\d+')).reply(200, {success: true, data: null});

  // ─── Document Requests ───────────────────────────────────────
  mockInstance.onGet('/document-requests/types').reply(200, MOCK_DOCUMENT_TYPES);
  mockInstance.onGet('/document-requests').reply(200, MOCK_DOCUMENT_REQUESTS);
  mockInstance.onPost('/document-requests').reply(201, MOCK_DOCUMENT_REQUEST_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/document-requests/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/document-requests/\\d+')).reply(200, {success: true, data: null});

  // ─── Experience Certificates ─────────────────────────────────
  mockInstance.onGet('/experience-certificates').reply(200, MOCK_EXPERIENCE_CERTIFICATES);
  mockInstance.onPost('/experience-certificates').reply(201, MOCK_CERTIFICATE_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/experience-certificates/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/experience-certificates/\\d+')).reply(200, {success: true, data: null});

  // ─── Business Services ───────────────────────────────────────
  mockInstance.onGet('/business-services/types').reply(200, MOCK_SERVICE_TYPES);
  mockInstance.onGet('/business-services').reply(200, MOCK_BUSINESS_SERVICES);
  mockInstance.onPost('/business-services').reply(201, MOCK_SERVICE_CREATE_SUCCESS);

  // ─── Tasks ───────────────────────────────────────────────────
  mockInstance.onGet('/tasks').reply(200, MOCK_TASKS);
  mockInstance.onPatch(new RegExp('/tasks/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onPost(new RegExp('/tasks/\\d+/attachments')).reply(200, {success: true, data: null});

  // ─── Timesheets ──────────────────────────────────────────────
  mockInstance.onGet('/timesheets').reply(200, MOCK_TIMESHEETS);
  mockInstance.onPost('/timesheets').reply(201, MOCK_LOG_TIME_SUCCESS);
  mockInstance.onPatch(new RegExp('/timesheets/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/timesheets/\\d+')).reply(200, {success: true, data: null});

  // ─── Profile ─────────────────────────────────────────────────
  mockInstance.onGet('/profile').reply(config => {
    const employeeId = config.params?.employee_id;
    if (employeeId && MOCK_PROFILES_BY_ID[employeeId]) {
      return [200, {success: true, data: MOCK_PROFILES_BY_ID[employeeId]}];
    }
    return [200, MOCK_PROFILE];
  });
  mockInstance.onGet('/employees').reply(200, MOCK_EMPLOYEES);

  // ─── Notifications ───────────────────────────────────────────
  mockInstance.onGet('/notifications').reply(200, MOCK_NOTIFICATIONS);
  mockInstance.onPatch(new RegExp('/notifications/\\d+/read')).reply(200, {success: true, data: null});
  mockInstance.onPost('/notifications/read-all').reply(200, {success: true, data: null});

  // ─── Announcements ───────────────────────────────────────────
  mockInstance.onGet('/announcements').reply(200, MOCK_ANNOUNCEMENTS);
  mockInstance.onPost('/announcements').reply(201, {success: true, data: null});

  // ─── Pending Approvals ────────────────────────────────────────
  mockInstance.onGet('/pending-approvals').reply(200, MOCK_PENDING_APPROVALS);
  mockInstance.onPost(new RegExp('/pending-approvals/\\d+/action')).reply(200, MOCK_APPROVAL_ACTION_SUCCESS);

  // ─── Personal Notes ───────────────────────────────────────────
  mockInstance.onGet('/personal-notes').reply(200, MOCK_PERSONAL_NOTES);
  mockInstance.onPost('/personal-notes').reply(201, MOCK_NOTE_CREATE_SUCCESS);
  mockInstance.onPatch(new RegExp('/personal-notes/\\d+')).reply(200, {success: true, data: null});
  mockInstance.onDelete(new RegExp('/personal-notes/\\d+')).reply(200, {success: true, data: null});

  // ─── Analytics ───────────────────────────────────────────────
  mockInstance.onGet('/analytics').reply(200, MOCK_ANALYTICS);

  // ─── Team Hours ──────────────────────────────────────────────
  mockInstance.onGet('/team-hours').reply(200, MOCK_TEAM_HOURS);
}

export function teardownMocks(): void {
  mockInstance?.restore();
  mockInstance = null;
}
