export type PayslipStatus = 'draft' | 'waiting' | 'done' | 'paid' | 'rejected';

export interface PayslipLine {
  code: string;
  name: string;
  name_ar: string;
  amount: number;
}

export interface Payslip {
  id: number;
  employee_id: number;
  month: number;
  year: number;
  status: PayslipStatus;
  gross: number;
  deductions: number;
  net: number;
  currency: string;
  earnings: PayslipLine[];
  deduction_lines: PayslipLine[];
  pdf_url?: string;
}
