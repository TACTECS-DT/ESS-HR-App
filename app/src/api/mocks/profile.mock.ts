import {ApiSuccess} from '../../types/api';

export interface EmployeeProfile {
  id: number;
  name: string;
  name_ar: string;
  badge_id: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  nationality_ar?: string;
  marital_status?: string;
  marital_status_ar?: string;
  dependents?: number;
  id_number?: string;
  avatar?: string;
  company?: string;
  company_ar?: string;
  department: string;
  department_ar: string;
  job_title: string;
  job_title_ar: string;
  manager?: string;
  manager_ar?: string;
  hire_date: string;
  contract_type: string;
  contract_type_ar: string;
  basic_salary?: number;
  role: 'employee' | 'manager' | 'hr' | 'admin';
}

export const MOCK_PROFILE: ApiSuccess<EmployeeProfile> = {
  success: true,
  data: {
    id: 101,
    name: 'Ahmed Al-Farsi',
    name_ar: 'أحمد الفارسي',
    badge_id: 'EMP-0042',
    email: 'ahmed.alfarsi@acmecorp.com',
    phone: '+966 50 123 4567',
    date_of_birth: '1990-05-15',
    nationality: 'Saudi Arabian',
    nationality_ar: 'سعودي',
    marital_status: 'Married',
    marital_status_ar: 'متزوج',
    dependents: 2,
    id_number: '1098765432',
    avatar: undefined,
    company: 'Acme Corporation',
    company_ar: 'شركة أكمي',
    department: 'Engineering',
    department_ar: 'الهندسة',
    job_title: 'Senior Software Engineer',
    job_title_ar: 'مهندس برمجيات أول',
    manager: 'Khalid Nasser',
    manager_ar: 'خالد ناصر',
    hire_date: '2020-01-15',
    contract_type: 'Full-Time',
    contract_type_ar: 'دوام كامل',
    basic_salary: 18000,
    role: 'manager',
  },
};
