export type AdvanceSalaryStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'paid';

export interface AdvanceSalary {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  title: string;
  amount: number;
  max_allowed: number;
  basic_salary: number;
  status: AdvanceSalaryStatus;
  request_date: string;
  reason?: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string; note?: string}>;
}
