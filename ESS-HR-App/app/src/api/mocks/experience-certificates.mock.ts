import {ApiSuccess} from '../../types/api';

export type CertificateStatus = 'draft' | 'pending' | 'approved' | 'refused';

export interface ExperienceCertificate {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  title: string;
  title_ar: string;
  directed_to: string;
  directed_to_ar?: string;
  required_date?: string;
  purpose?: string;
  purpose_ar?: string;
  request_date: string;
  status: CertificateStatus;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}

export const MOCK_EXPERIENCE_CERTIFICATES: ApiSuccess<ExperienceCertificate[]> = {
  success: true,
  data: [
    {
      id: 901,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Employment Certificate',
      title_ar: 'شهادة توظيف',
      directed_to: 'New Employer',
      directed_to_ar: 'صاحب عمل جديد',
      required_date: '2026-03-01',
      purpose: 'Required for new job application process.',
      purpose_ar: 'مطلوبة لإجراءات التقديم على وظيفة جديدة.',
      request_date: '2026-02-15',
      status: 'approved',
      approval_history: [{step: 'HR', approver: 'Fatima Hassan', status: 'approved', date: '2026-02-16'}],
    },
    {
      id: 902,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Work Experience Letter',
      title_ar: 'خطاب خبرة عمل',
      directed_to: 'Ministry of Labor',
      directed_to_ar: 'وزارة العمل',
      required_date: '2026-03-20',
      purpose: 'Required for labor compliance verification.',
      purpose_ar: 'مطلوبة للتحقق من الامتثال لقوانين العمل.',
      request_date: '2026-03-08',
      status: 'pending',
      approval_history: [{step: 'HR', approver: 'Fatima Hassan', status: 'pending'}],
    },
    {
      id: 903,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Experience Certificate - Embassy',
      title_ar: 'شهادة خبرة - السفارة',
      directed_to: 'Embassy of UAE',
      directed_to_ar: 'سفارة الإمارات',
      required_date: '2026-04-05',
      purpose: 'Visa application documentation.',
      purpose_ar: 'وثائق طلب التأشيرة.',
      request_date: '2026-03-14',
      status: 'draft',
      approval_history: [],
    },
    // HR officer sees all employees
    {
      id: 904,
      employee_id: 112,
      employee: 'Noor Mohamed',
      employee_ar: 'نور محمد',
      title: 'Employment Certificate',
      title_ar: 'شهادة توظيف',
      directed_to: 'Saudi Embassy',
      directed_to_ar: 'السفارة السعودية',
      required_date: '2026-04-10',
      purpose: 'Visa application.',
      purpose_ar: 'طلب تأشيرة.',
      request_date: '2026-03-20',
      status: 'pending',
      approval_history: [{step: 'HR', approver: 'Sara Al-Amin', status: 'pending'}],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 4, totalPages: 1},
};

export const MOCK_CERTIFICATE_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 902},
  message: 'Experience certificate request submitted.',
};
