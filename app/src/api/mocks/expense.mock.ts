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
  employee_id: number;
  employee: string;
  employee_ar: string;
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
    // Employee (id=100)
    {id: 401, employee_id: 100, employee: 'Ahmed Al-Farsi', employee_ar: 'أحمد الفارسي', name: 'Flight to Dubai', category: 'Travel', category_ar: 'سفر', amount: 1200, currency: 'SAR', tax_amount: 60, payment_mode: 'employee_paid', date: '2026-03-05', status: 'approved', attachments: []},
    {id: 402, employee_id: 100, employee: 'Ahmed Al-Farsi', employee_ar: 'أحمد الفارسي', name: 'Team lunch', category: 'Meals', category_ar: 'وجبات', amount: 350, currency: 'SAR', tax_amount: 17.5, payment_mode: 'company_paid', date: '2026-03-01', status: 'posted', attachments: []},
    {id: 403, employee_id: 100, employee: 'Ahmed Al-Farsi', employee_ar: 'أحمد الفارسي', name: 'Training course', category: 'Training', category_ar: 'تدريب', amount: 2500, currency: 'SAR', tax_amount: 125, payment_mode: 'employee_paid', date: '2026-02-20', status: 'draft', attachments: []},
    {id: 404, employee_id: 100, employee: 'Ahmed Al-Farsi', employee_ar: 'أحمد الفارسي', name: 'Business travel expenses', category: 'Travel', category_ar: 'سفر', amount: 850, currency: 'SAR', tax_amount: 42.5, payment_mode: 'employee_paid', date: '2026-03-20', status: 'submitted', attachments: ['receipt_travel.pdf'], description: 'Client meeting in Riyadh — hotel and transport'},
    // Subordinate Fatima (id=110) — visible to manager/hr/admin
    {id: 405, employee_id: 110, employee: 'Fatima Al-Zahra', employee_ar: 'فاطمة الزهراء', name: 'Office supplies', category: 'Office Supplies', category_ar: 'مستلزمات مكتبية', amount: 480, currency: 'SAR', tax_amount: 24, payment_mode: 'employee_paid', date: '2026-03-12', status: 'submitted', attachments: []},
    {id: 406, employee_id: 110, employee: 'Fatima Al-Zahra', employee_ar: 'فاطمة الزهراء', name: 'Client dinner', category: 'Meals', category_ar: 'وجبات', amount: 620, currency: 'SAR', tax_amount: 31, payment_mode: 'company_paid', date: '2026-02-25', status: 'approved', attachments: []},
    // Subordinate Omar (id=111) — visible to manager/hr/admin
    {id: 407, employee_id: 111, employee: 'Omar Al-Rashid', employee_ar: 'عمر الراشد', name: 'Conference registration', category: 'Training', category_ar: 'تدريب', amount: 3200, currency: 'SAR', tax_amount: 160, payment_mode: 'employee_paid', date: '2026-03-08', status: 'pending', attachments: ['conference_reg.pdf']},
    // Manager's own (id=101)
    {id: 408, employee_id: 101, employee: 'Khalid Al-Mansouri', employee_ar: 'خالد المنصوري', name: 'Team building event', category: 'Meals', category_ar: 'وجبات', amount: 1800, currency: 'SAR', tax_amount: 90, payment_mode: 'company_paid', date: '2026-03-18', status: 'approved', attachments: []},
  ],
  pagination: {page: 1, pageSize: 10, total: 8, totalPages: 1},
};

export const MOCK_EXPENSE_CREATE_SUCCESS: ApiSuccess<{id: number; expense_report_id: number}> = {
  success: true,
  data: {id: 404, expense_report_id: 2001},
  message: 'Expense submitted and report created.',
};
