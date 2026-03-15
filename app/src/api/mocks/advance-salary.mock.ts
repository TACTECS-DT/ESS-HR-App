import {ApiSuccess} from '../../types/api';

export type AdvanceSalaryStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'paid';

export interface AdvanceSalary {
  id: number;
  title: string;
  amount: number;
  max_allowed: number;
  basic_salary: number;
  status: AdvanceSalaryStatus;
  request_date: string;
  reason?: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string; note?: string}>;
}

export const MOCK_ADVANCE_SALARY_INFO: ApiSuccess<{basic_salary: number; max_advance: number}> = {
  success: true,
  data: {basic_salary: 10000, max_advance: 5000},
};

export const MOCK_ADVANCE_SALARIES: ApiSuccess<AdvanceSalary[]> = {
  success: true,
  data: [
    {
      id: 601,
      title: 'Advance - February 2026',
      amount: 3000,
      max_allowed: 5000,
      basic_salary: 10000,
      status: 'approved',
      request_date: '2026-02-01',
      reason: 'Medical emergency for family member',
      approval_history: [
        {step: 'Manager', approver: 'Khalid Nasser', status: 'approved', date: '2026-02-02'},
        {step: 'HR', approver: 'Fatima Hassan', status: 'approved', date: '2026-02-03'},
      ],
    },
    {
      id: 602,
      title: 'Advance - January 2026',
      amount: 2000,
      max_allowed: 5000,
      basic_salary: 10000,
      status: 'refused',
      request_date: '2026-01-05',
      reason: 'Personal expenses',
      approval_history: [
        {step: 'Manager', approver: 'Khalid Nasser', status: 'refused', date: '2026-01-06', note: 'Not applicable at this time'},
      ],
    },
    {
      id: 603,
      title: 'Advance - March 2026',
      amount: 5000,
      max_allowed: 5000,
      basic_salary: 10000,
      status: 'draft',
      request_date: '2026-03-10',
      approval_history: [],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 3, totalPages: 1},
};

export const MOCK_ADVANCE_SALARY_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 603},
  message: 'Advance salary request submitted.',
};
