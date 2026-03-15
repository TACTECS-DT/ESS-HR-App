import {ApiSuccess} from '../../types/api';

export type HRLetterStatus = 'draft' | 'pending' | 'approved' | 'refused';
export type SalaryType = 'net' | 'gross';

export interface HRLetter {
  id: number;
  letter_title: string;
  directed_to: string;
  salary_type: SalaryType;
  status: HRLetterStatus;
  request_date: string;
  required_date?: string;
  purpose?: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}

export const MOCK_HR_LETTERS: ApiSuccess<HRLetter[]> = {
  success: true,
  data: [
    {
      id: 701,
      letter_title: 'Salary Certificate',
      directed_to: 'Saudi Embassy',
      salary_type: 'gross',
      status: 'approved',
      request_date: '2026-02-10',
      required_date: '2026-02-20',
      purpose: 'Required for visa application to Saudi Embassy.',
      approval_history: [
        {step: 'HR', approver: 'Fatima Hassan', status: 'approved', date: '2026-02-11'},
      ],
    },
    {
      id: 702,
      letter_title: 'Employment Certificate',
      directed_to: 'Bank Al-Rajhi',
      salary_type: 'net',
      status: 'pending',
      request_date: '2026-03-08',
      required_date: '2026-03-15',
      purpose: 'Required for opening a bank account.',
      approval_history: [
        {step: 'HR', approver: 'Fatima Hassan', status: 'pending'},
      ],
    },
    {
      id: 703,
      letter_title: 'Salary Proof',
      directed_to: 'Ministry of Finance',
      salary_type: 'gross',
      status: 'draft',
      request_date: '2026-03-14',
      required_date: '2026-03-25',
      purpose: 'Needed for government benefits application.',
      approval_history: [],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 3, totalPages: 1},
};

export const MOCK_HR_LETTER_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 703},
  message: 'HR letter request submitted.',
};
