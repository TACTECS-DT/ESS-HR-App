export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'in_progress' | 'done';

export interface ServiceType {
  id: number;
  name: string;
  name_ar: string;
}

export interface BusinessService {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  title: string;
  title_ar: string;
  service_type: string;
  service_type_ar: string;
  reason: string;
  reason_ar?: string;
  requested_date: string;
  status: ServiceStatus;
  request_date: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}
