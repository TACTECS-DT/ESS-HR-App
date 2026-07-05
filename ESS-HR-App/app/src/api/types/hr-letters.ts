export type HRLetterStatus = 'draft' | 'pending' | 'approved' | 'refused';
export type SalaryType = 'net' | 'gross';

export interface HRLetter {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  letter_title: string;
  directed_to: string;
  salary_type: SalaryType;
  status: HRLetterStatus;
  request_date: string;
  required_date?: string;
  purpose?: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}
