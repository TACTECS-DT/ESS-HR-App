export type LoanStatus = 'draft' | 'pending' | 'manager_approved' | 'hr_approved' | 'ceo_approved' | 'refused' | 'active' | 'closed';

export interface LoanInstallment {
  month: string;
  amount: number;
  status: 'pending' | 'paid';
}

export interface Loan {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  amount: number;
  duration_months: number;
  monthly_installment: number;
  transfer_method: string;
  status: LoanStatus;
  request_date: string;
  reason?: string;
  installments: LoanInstallment[];
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}

export interface LoanRules {
  min_hiring_months: number;
  max_duration_months: number;
  min_gap_months: number;
  max_amount: number;
  eligible: boolean;
  ineligibility_reason?: string;
  ineligibility_reason_ar?: string;
}
