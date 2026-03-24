import {ApiSuccess} from '../../types/api';

export type ApprovalType = 'leave' | 'expense' | 'loan' | 'advance_salary' | 'hr_request' | 'business_service';

/**
 * record_id   — the ID of the actual module record (leave request, expense, loan, etc.)
 * record_type — used for hr_request to distinguish the exact screen:
 *               'hr_letter' | 'document_request' | 'experience_cert'
 *               For all other types it mirrors `type`.
 */
export type HRRequestRecordType = 'hr_letter' | 'document_request' | 'experience_cert';

export interface PendingApproval {
  id: number;
  employee_id: number;
  type: ApprovalType;
  record_id: number;
  record_type?: HRRequestRecordType;
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
    {id: 1,  employee_id: 100, type: 'leave',            record_id: 201,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'Annual Leave | Mar 15–17 (3 days)',          details_ar: 'إجازة سنوية | ١٥–١٧ مارس (٣ أيام)',        status: 'pending'},
    {id: 2,  employee_id: 100, type: 'expense',           record_id: 404,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'Travel Expense | 850 SAR',                   details_ar: 'مصروف سفر | ٨٥٠ ريال',                    status: 'pending', amount: 850,   currency: 'SAR'},
    {id: 3,  employee_id: 111, type: 'loan',              record_id: 505,  employee: 'Omar Al-Rashid',  employee_ar: 'عمر الراشد',    details: 'Personal Loan | 8,000 SAR — 8 months',       details_ar: 'قرض شخصي | ٨,٠٠٠ ريال — ٨ أشهر',          status: 'pending', amount: 8000,  currency: 'SAR'},
    {id: 4,  employee_id: 110, type: 'advance_salary',    record_id: 605,  employee: 'Fatima Al-Zahra', employee_ar: 'فاطمة الزهراء', details: 'Advance Salary | 2,000 SAR',                 details_ar: 'سلفة راتب | ٢,٠٠٠ ريال',                  status: 'pending', amount: 2000,  currency: 'SAR'},
    {id: 5,  employee_id: 100, type: 'leave',             record_id: 204,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'Sick Leave | Mar 18 (1 day)',                details_ar: 'إجازة مرضية | ١٨ مارس (يوم واحد)',         status: 'pending'},
    {id: 6,  employee_id: 110, type: 'business_service',  record_id: 1004, employee: 'Fatima Al-Zahra', employee_ar: 'فاطمة الزهراء', details: 'SIM Card Request | Business Line',           details_ar: 'طلب شريحة اتصال | خط عمل',                status: 'pending'},
    {id: 7,  employee_id: 112, type: 'leave',             record_id: 211,  employee: 'Noor Mohamed',    employee_ar: 'نور محمد',      details: 'Annual Leave | Mar 28–Apr 1 (5 days)',        details_ar: 'إجازة سنوية | ٢٨ مارس–١ أبريل (٥ أيام)',  status: 'pending'},
    {id: 8,  employee_id: 100, type: 'hr_request', record_type: 'hr_letter',        record_id: 702,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'HR Letter | Employment Certificate — Bank',  details_ar: 'خطاب موارد بشرية | شهادة توظيف — بنك',    status: 'pending'},
    {id: 9,  employee_id: 100, type: 'hr_request', record_type: 'experience_cert',  record_id: 902,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'Experience Certificate | Ministry of Labor', details_ar: 'شهادة خبرة | وزارة العمل',                 status: 'pending'},
    {id: 10, employee_id: 100, type: 'hr_request', record_type: 'document_request', record_id: 802,  employee: 'Ahmed Al-Farsi',  employee_ar: 'أحمد الفارسي',  details: 'Document Return | National ID',              details_ar: 'استرداد وثيقة | الهوية الوطنية',           status: 'pending'},
  ],
};

export const MOCK_APPROVAL_ACTION_SUCCESS: ApiSuccess<null> = {
  success: true,
  data: null,
  message: 'Action completed successfully.',
};
