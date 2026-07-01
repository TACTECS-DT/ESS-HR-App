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
