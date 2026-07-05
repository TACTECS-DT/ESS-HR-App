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
  avatar?: string | false;
  role: 'employee' | 'manager' | 'hr' | 'admin';
  company_id: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
