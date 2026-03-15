import {ApiSuccess} from '../../types/api';

export type ApprovalType = 'leave' | 'expense' | 'loan' | 'advance_salary';

export interface PendingApproval {
  id: number;
  type: ApprovalType;
  employee: string;
  employee_ar: string;
  details: string;
  details_ar: string;
  status: 'pending';
  amount?: number;
  currency?: string;
}

export const MOCK_PENDING_APPROVALS: ApiSuccess<PendingApproval[]> = {
  success: true,
  data: [
    {
      id: 1,
      type: 'leave',
      employee: 'Ahmed Hassan',
      employee_ar: 'أحمد حسن',
      details: 'Annual Leave | Mar 15–17 (3 days)',
      details_ar: 'إجازة سنوية | ١٥–١٧ مارس (٣ أيام)',
      status: 'pending',
    },
    {
      id: 2,
      type: 'expense',
      employee: 'Sara Khalid',
      employee_ar: 'سارة خالد',
      details: 'Travel Expense | 850 SAR',
      details_ar: 'مصروف سفر | ٨٥٠ ريال',
      status: 'pending',
      amount: 850,
      currency: 'SAR',
    },
    {
      id: 3,
      type: 'loan',
      employee: 'Omar Al-Rashid',
      employee_ar: 'عمر الراشد',
      details: 'Personal Loan | 10,000 SAR — 12 months',
      details_ar: 'قرض شخصي | ١٠,٠٠٠ ريال — ١٢ شهراً',
      status: 'pending',
      amount: 10000,
      currency: 'SAR',
    },
    {
      id: 4,
      type: 'advance_salary',
      employee: 'Fatima Khalil',
      employee_ar: 'فاطمة خليل',
      details: 'Advance Salary | 2,500 SAR',
      details_ar: 'سلفة راتب | ٢,٥٠٠ ريال',
      status: 'pending',
      amount: 2500,
      currency: 'SAR',
    },
    {
      id: 5,
      type: 'leave',
      employee: 'Noor Mohamed',
      employee_ar: 'نور محمد',
      details: 'Sick Leave | Mar 18 (1 day)',
      details_ar: 'إجازة مرضية | ١٨ مارس (يوم واحد)',
      status: 'pending',
    },
  ],
};

export const MOCK_APPROVAL_ACTION_SUCCESS: ApiSuccess<null> = {
  success: true,
  data: null,
  message: 'Action completed successfully.',
};
