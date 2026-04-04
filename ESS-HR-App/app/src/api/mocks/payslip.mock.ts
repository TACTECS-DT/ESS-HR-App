import {ApiSuccess} from '../../types/api';

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

export const MOCK_PAYSLIP_LIST: ApiSuccess<Payslip[]> = {
  success: true,
  data: [
    {
      id: 301,
      employee_id: 100,
      month: 2, year: 2026, status: 'paid', gross: 15000, deductions: 1500, net: 13500, currency: 'SAR',
      earnings: [
        {code: 'BASIC', name: 'Basic Salary', name_ar: 'الراتب الأساسي', amount: 10000},
        {code: 'HRA', name: 'Housing Allowance', name_ar: 'بدل السكن', amount: 3500},
        {code: 'TRANS', name: 'Transportation', name_ar: 'بدل النقل', amount: 1500},
      ],
      deduction_lines: [
        {code: 'GOSI', name: 'GOSI Contribution', name_ar: 'مساهمة التأمينات', amount: 900},
        {code: 'ABSENCE', name: 'Absence Deduction', name_ar: 'خصم الغياب', amount: 600},
      ],
    },
    {
      id: 302,
      employee_id: 100,
      month: 1, year: 2026, status: 'paid', gross: 15000, deductions: 900, net: 14100, currency: 'SAR',
      earnings: [
        {code: 'BASIC', name: 'Basic Salary', name_ar: 'الراتب الأساسي', amount: 10000},
        {code: 'HRA', name: 'Housing Allowance', name_ar: 'بدل السكن', amount: 3500},
        {code: 'TRANS', name: 'Transportation', name_ar: 'بدل النقل', amount: 1500},
      ],
      deduction_lines: [
        {code: 'GOSI', name: 'GOSI Contribution', name_ar: 'مساهمة التأمينات', amount: 900},
      ],
    },
    {
      id: 303,
      employee_id: 100,
      month: 3, year: 2026, status: 'draft', gross: 15000, deductions: 900, net: 14100, currency: 'SAR',
      earnings: [
        {code: 'BASIC', name: 'Basic Salary', name_ar: 'الراتب الأساسي', amount: 10000},
        {code: 'HRA', name: 'Housing Allowance', name_ar: 'بدل السكن', amount: 3500},
        {code: 'TRANS', name: 'Transportation', name_ar: 'بدل النقل', amount: 1500},
      ],
      deduction_lines: [
        {code: 'GOSI', name: 'GOSI Contribution', name_ar: 'مساهمة التأمينات', amount: 900},
      ],
    },
  ],
  pagination: {page: 1, pageSize: 12, total: 3, totalPages: 1},
};
