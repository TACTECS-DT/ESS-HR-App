import {ApiSuccess} from '../../types/api';

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'refused' | 'posted';
export type PaymentMode = 'company_paid' | 'employee_paid';

export interface ExpenseCategory {
  id: number;
  name: string;
  name_ar: string;
}

export interface Expense {
  id: number;
  name: string;
  category: string;
  category_ar: string;
  amount: number;
  currency: string;
  tax_amount: number;
  payment_mode: PaymentMode;
  date: string;
  status: ExpenseStatus;
  attachments: string[];
  description?: string;
  expense_report_id?: number;
}

export const MOCK_EXPENSE_CATEGORIES: ApiSuccess<ExpenseCategory[]> = {
  success: true,
  data: [
    {id: 1, name: 'Travel', name_ar: 'سفر'},
    {id: 2, name: 'Meals', name_ar: 'وجبات'},
    {id: 3, name: 'Accommodation', name_ar: 'إقامة'},
    {id: 4, name: 'Office Supplies', name_ar: 'مستلزمات مكتبية'},
    {id: 5, name: 'Training', name_ar: 'تدريب'},
    {id: 6, name: 'Communication', name_ar: 'اتصالات'},
  ],
};

export const MOCK_EXPENSES: ApiSuccess<Expense[]> = {
  success: true,
  data: [
    {id: 401, name: 'Flight to Dubai', category: 'Travel', category_ar: 'سفر', amount: 1200, currency: 'SAR', tax_amount: 60, payment_mode: 'employee_paid', date: '2026-03-05', status: 'approved', attachments: []},
    {id: 402, name: 'Team lunch', category: 'Meals', category_ar: 'وجبات', amount: 350, currency: 'SAR', tax_amount: 17.5, payment_mode: 'company_paid', date: '2026-03-01', status: 'posted', attachments: []},
    {id: 403, name: 'Training course', category: 'Training', category_ar: 'تدريب', amount: 2500, currency: 'SAR', tax_amount: 125, payment_mode: 'employee_paid', date: '2026-02-20', status: 'draft', attachments: []},
  ],
  pagination: {page: 1, pageSize: 10, total: 3, totalPages: 1},
};

export const MOCK_EXPENSE_CREATE_SUCCESS: ApiSuccess<{id: number; expense_report_id: number}> = {
  success: true,
  data: {id: 404, expense_report_id: 2001},
  message: 'Expense submitted and report created.',
};
