import {ApiSuccess} from '../../types/api';

export type LoanStatus = 'draft' | 'pending' | 'manager_approved' | 'hr_approved' | 'ceo_approved' | 'refused' | 'active' | 'closed';

export interface LoanInstallment {
  month: string;
  amount: number;
  status: 'pending' | 'paid';
}

export interface Loan {
  id: number;
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

export const MOCK_LOAN_RULES: ApiSuccess<LoanRules> = {
  success: true,
  data: {
    min_hiring_months: 12,
    max_duration_months: 24,
    min_gap_months: 6,
    max_amount: 30000,
    eligible: true,
  },
};

export const MOCK_LOANS: ApiSuccess<Loan[]> = {
  success: true,
  data: [
    {
      id: 501,
      amount: 15000,
      duration_months: 12,
      monthly_installment: 1250,
      transfer_method: 'Bank Transfer',
      status: 'active',
      request_date: '2025-06-01',
      installments: [
        {month: '2025-07', amount: 1250, status: 'paid'},
        {month: '2025-08', amount: 1250, status: 'paid'},
        {month: '2025-09', amount: 1250, status: 'paid'},
        {month: '2025-10', amount: 1250, status: 'paid'},
        {month: '2025-11', amount: 1250, status: 'paid'},
        {month: '2025-12', amount: 1250, status: 'paid'},
        {month: '2026-01', amount: 1250, status: 'paid'},
        {month: '2026-02', amount: 1250, status: 'paid'},
        {month: '2026-03', amount: 1250, status: 'pending'},
        {month: '2026-04', amount: 1250, status: 'pending'},
        {month: '2026-05', amount: 1250, status: 'pending'},
        {month: '2026-06', amount: 1250, status: 'pending'},
      ],
      approval_history: [
        {step: 'Manager', approver: 'Khalid Nasser', status: 'approved', date: '2025-06-02'},
        {step: 'HR', approver: 'Fatima Hassan', status: 'approved', date: '2025-06-03'},
        {step: 'CEO', approver: 'Mohammed Al-Rashid', status: 'approved', date: '2025-06-04'},
      ],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 1, totalPages: 1},
};

export const MOCK_LOAN_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 502},
  message: 'Loan application submitted successfully.',
};
