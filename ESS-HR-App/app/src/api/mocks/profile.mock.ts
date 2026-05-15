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

/** Lightweight employee list item for the directory */
export interface EmployeeListItem {
  id: number;
  name: string;
  name_ar: string;
  badge_id: string;
  job_title: string;
  job_title_ar: string;
  department: string;
  department_ar: string;
  role: 'employee' | 'manager' | 'hr' | 'admin';
}

export const MOCK_EMPLOYEES: ApiSuccess<EmployeeListItem[]> = {
  success: true,
  data: [
    {id: 100, name: 'Employee',  name_ar: 'موظف',          badge_id: 'employee', job_title: 'Employee',          job_title_ar: 'موظف',                department: 'Operations',      department_ar: 'العمليات',         role: 'employee'},
    {id: 101, name: 'Manager',   name_ar: 'مدير',           badge_id: 'manager',  job_title: 'Manager',           job_title_ar: 'مدير',                department: 'Engineering',     department_ar: 'الهندسة',          role: 'manager'},
    {id: 102, name: 'HR',        name_ar: 'موارد بشرية',    badge_id: 'hr',       job_title: 'HR Officer',        job_title_ar: 'موظف موارد بشرية',   department: 'Human Resources', department_ar: 'الموارد البشرية',  role: 'hr'},
    {id: 103, name: 'Admin',     name_ar: 'مدير النظام',    badge_id: 'admin',    job_title: 'Administrator',     job_title_ar: 'مدير النظام',         department: 'Administration',  department_ar: 'الإدارة',          role: 'admin'},
    {id: 104, name: 'Noor Salem',name_ar: 'نور سالم',       badge_id: 'EMP-0104', job_title: 'UI/UX Designer',    job_title_ar: 'مصمم واجهات',         department: 'Engineering',     department_ar: 'الهندسة',          role: 'employee'},
    {id: 105, name: 'Tariq Hani',name_ar: 'طارق هاني',      badge_id: 'EMP-0105', job_title: 'Accountant',        job_title_ar: 'محاسب',               department: 'Finance',         department_ar: 'المالية',          role: 'employee'},
    {id: 106, name: 'Hessa Ali', name_ar: 'حصة علي',        badge_id: 'EMP-0106', job_title: 'Procurement Officer',job_title_ar: 'موظف مشتريات',       department: 'Operations',      department_ar: 'العمليات',         role: 'employee'},
  ],
};

/** Full profiles indexed by employee id for the mock /profile?employee_id= endpoint */
export const MOCK_PROFILES_BY_ID: Record<number, EmployeeProfile> = {
  100: {id: 100, name: 'Employee',   name_ar: 'موظف',       badge_id: 'employee', email: 'employee@acmecorp.com', phone: '+966 50 111 1100', date_of_birth: '1995-03-20', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Single', marital_status_ar: 'أعزب', dependents: 0, id_number: '1011111100', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Operations', department_ar: 'العمليات', job_title: 'Employee', job_title_ar: 'موظف', manager: 'Manager', manager_ar: 'مدير', hire_date: '2022-06-01', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 8000, role: 'employee'},
  101: {id: 101, name: 'Manager',    name_ar: 'مدير',       badge_id: 'manager',  email: 'manager@acmecorp.com',  phone: '+966 50 222 2200', date_of_birth: '1988-07-10', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Married', marital_status_ar: 'متزوج', dependents: 2, id_number: '1022222200', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Engineering', department_ar: 'الهندسة', job_title: 'Manager', job_title_ar: 'مدير', manager: 'Admin', manager_ar: 'مدير النظام', hire_date: '2018-03-15', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 18000, role: 'manager'},
  102: {id: 102, name: 'HR',         name_ar: 'موارد بشرية',badge_id: 'hr',       email: 'hr@acmecorp.com',       phone: '+966 50 333 3300', date_of_birth: '1991-11-05', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Married', marital_status_ar: 'متزوجة', dependents: 1, id_number: '1033333300', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Human Resources', department_ar: 'الموارد البشرية', job_title: 'HR Officer', job_title_ar: 'موظف موارد بشرية', manager: 'Admin', manager_ar: 'مدير النظام', hire_date: '2019-09-01', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 14000, role: 'hr'},
  103: {id: 103, name: 'Admin',      name_ar: 'مدير النظام',badge_id: 'admin',    email: 'admin@acmecorp.com',    phone: '+966 50 444 4400', date_of_birth: '1985-01-01', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Married', marital_status_ar: 'متزوج', dependents: 3, id_number: '1044444400', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Administration', department_ar: 'الإدارة', job_title: 'Administrator', job_title_ar: 'مدير النظام', manager: undefined, manager_ar: undefined, hire_date: '2015-01-01', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 28000, role: 'admin'},
  104: {id: 104, name: 'Noor Salem', name_ar: 'نور سالم',   badge_id: 'EMP-0104', email: 'noor@acmecorp.com',     phone: '+966 50 555 5500', date_of_birth: '1997-04-18', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Single', marital_status_ar: 'عزباء', dependents: 0, id_number: '1055555500', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Engineering', department_ar: 'الهندسة', job_title: 'UI/UX Designer', job_title_ar: 'مصمم واجهات', manager: 'Manager', manager_ar: 'مدير', hire_date: '2023-01-10', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 9500, role: 'employee'},
  105: {id: 105, name: 'Tariq Hani', name_ar: 'طارق هاني',  badge_id: 'EMP-0105', email: 'tariq@acmecorp.com',    phone: '+966 50 666 6600', date_of_birth: '1993-08-25', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Married', marital_status_ar: 'متزوج', dependents: 1, id_number: '1066666600', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Finance', department_ar: 'المالية', job_title: 'Accountant', job_title_ar: 'محاسب', manager: 'Admin', manager_ar: 'مدير النظام', hire_date: '2021-04-05', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 11000, role: 'employee'},
  106: {id: 106, name: 'Hessa Ali',  name_ar: 'حصة علي',    badge_id: 'EMP-0106', email: 'hessa@acmecorp.com',    phone: '+966 50 777 7700', date_of_birth: '1994-12-12', nationality: 'Saudi Arabian', nationality_ar: 'سعودي', marital_status: 'Single', marital_status_ar: 'عزباء', dependents: 0, id_number: '1077777700', company: 'Acme Corporation', company_ar: 'شركة أكمي', department: 'Operations', department_ar: 'العمليات', job_title: 'Procurement Officer', job_title_ar: 'موظف مشتريات', manager: 'Manager', manager_ar: 'مدير', hire_date: '2022-11-20', contract_type: 'Full-Time', contract_type_ar: 'دوام كامل', basic_salary: 9000, role: 'employee'},
};

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
