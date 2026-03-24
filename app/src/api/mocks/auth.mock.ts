import {ApiSuccess} from '../../types/api';

export interface Company {
  id: number;
  name: string;
  name_ar: string;
  logo?: string;
}

export interface UserInfo {
  id: number;
  name: string;
  name_ar: string;
  badge_id: string;
  email: string;
  department: string;
  department_ar: string;
  job_title: string;
  job_title_ar: string;
  avatar?: string;
  role: 'employee' | 'manager' | 'hr' | 'admin';
  company_id: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const MOCK_LICENSE_VALID: ApiSuccess<{companies: Company[]}> = {
  success: true,
  data: {
    companies: [
      {id: 1, name: 'Acme Corp', name_ar: 'شركة أكمي', logo: undefined},
      {id: 2, name: 'Acme Holding', name_ar: 'أكمي القابضة', logo: undefined},
    ],
  },
};

export const MOCK_LICENSE_INVALID: {success: false; error: {code: string; message: string; message_ar: string}} = {
  success: false,
  error: {
    code: 'INVALID_LICENSE',
    message: 'Invalid or expired license key.',
    message_ar: 'مفتاح الترخيص غير صالح أو منتهي الصلاحية.',
  },
};

// ─── Mock tokens (shared) ────────────────────────────────────
const MOCK_TOKENS: AuthTokens = {
  access_token: 'mock.access.token.eyJhbGciOiJIUzI1NiJ9',
  refresh_token: 'mock.refresh.token.eyJhbGciOiJIUzI1NiJ9',
  expires_in: 3600,
};

// ─── Mock users — one per role ────────────────────────────────
// badge_id = role name for easy manual login (e.g. type "employee" in badge field)
export const MOCK_USER_EMPLOYEE: UserInfo = {
  id: 100,
  name: 'Employee',
  name_ar: 'موظف',
  badge_id: 'employee',
  email: 'employee@acmecorp.com',
  department: 'Operations',
  department_ar: 'العمليات',
  job_title: 'Employee',
  job_title_ar: 'موظف',
  avatar: undefined,
  role: 'employee',
  company_id: 1,
};

export const MOCK_USER_MANAGER: UserInfo = {
  id: 101,
  name: 'Manager',
  name_ar: 'مدير',
  badge_id: 'manager',
  email: 'manager@acmecorp.com',
  department: 'Engineering',
  department_ar: 'الهندسة',
  job_title: 'Manager',
  job_title_ar: 'مدير',
  avatar: undefined,
  role: 'manager',
  company_id: 1,
};

export const MOCK_USER_HR: UserInfo = {
  id: 102,
  name: 'HR',
  name_ar: 'موارد بشرية',
  badge_id: 'hr',
  email: 'hr@acmecorp.com',
  department: 'Human Resources',
  department_ar: 'الموارد البشرية',
  job_title: 'HR Officer',
  job_title_ar: 'موظف موارد بشرية',
  avatar: undefined,
  role: 'hr',
  company_id: 1,
};

export const MOCK_USER_ADMIN: UserInfo = {
  id: 103,
  name: 'Admin',
  name_ar: 'مدير النظام',
  badge_id: 'admin',
  email: 'admin@acmecorp.com',
  department: 'Administration',
  department_ar: 'الإدارة',
  job_title: 'Administrator',
  job_title_ar: 'مدير النظام',
  avatar: undefined,
  role: 'admin',
  company_id: 1,
};

/** All mock users indexed by badge_id for quick lookup in mock login handler */
export const MOCK_USERS_BY_BADGE: Record<string, UserInfo> = {
  [MOCK_USER_EMPLOYEE.badge_id]: MOCK_USER_EMPLOYEE,
  [MOCK_USER_MANAGER.badge_id]:  MOCK_USER_MANAGER,
  [MOCK_USER_HR.badge_id]:       MOCK_USER_HR,
  [MOCK_USER_ADMIN.badge_id]:    MOCK_USER_ADMIN,
};

/** Default login response (manager) — used when badge_id not in MOCK_USERS_BY_BADGE */
export const MOCK_LOGIN_SUCCESS: ApiSuccess<{user: UserInfo; tokens: AuthTokens}> = {
  success: true,
  data: {
    user: MOCK_USER_MANAGER,
    tokens: MOCK_TOKENS,
  },
};

/** Helper: build a login success response for any mock user */
export function mockLoginAs(user: UserInfo): ApiSuccess<{user: UserInfo; tokens: AuthTokens}> {
  return {success: true, data: {user, tokens: MOCK_TOKENS}};
}

export const MOCK_LOGIN_INVALID: {success: false; error: {code: string; message: string; message_ar: string}} = {
  success: false,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid badge ID or PIN.',
    message_ar: 'رقم الشارة أو الرقم السري غير صحيح.',
  },
};

export const MOCK_REFRESH_SUCCESS: ApiSuccess<AuthTokens> = {
  success: true,
  data: {
    access_token: 'mock.access.token.refreshed',
    refresh_token: 'mock.refresh.token.refreshed',
    expires_in: 3600,
  },
};
