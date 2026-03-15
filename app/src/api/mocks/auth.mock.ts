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

export const MOCK_LOGIN_SUCCESS: ApiSuccess<{user: UserInfo; tokens: AuthTokens}> = {
  success: true,
  data: {
    user: {
      id: 101,
      name: 'Ahmed Al-Farsi',
      name_ar: 'أحمد الفارسي',
      badge_id: 'EMP-0042',
      email: 'ahmed.alfarsi@acmecorp.com',
      department: 'Engineering',
      department_ar: 'الهندسة',
      job_title: 'Senior Software Engineer',
      job_title_ar: 'مهندس برمجيات أول',
      avatar: undefined,
      role: 'manager',
      company_id: 1,
    },
    tokens: {
      access_token: 'mock.access.token.eyJhbGciOiJIUzI1NiJ9',
      refresh_token: 'mock.refresh.token.eyJhbGciOiJIUzI1NiJ9',
      expires_in: 3600,
    },
  },
};

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
