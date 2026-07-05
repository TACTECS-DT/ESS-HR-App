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
  avatar?: string | false;
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
