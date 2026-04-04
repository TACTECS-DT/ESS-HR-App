import {ApiSuccess} from '../../types/api';

export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'in_progress' | 'done';

export interface ServiceType {
  id: number;
  name: string;
  name_ar: string;
}

export interface BusinessService {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  title: string;
  title_ar: string;
  service_type: string;
  service_type_ar: string;
  reason: string;
  reason_ar?: string;
  requested_date: string;
  status: ServiceStatus;
  request_date: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}

export const MOCK_SERVICE_TYPES: ApiSuccess<ServiceType[]> = {
  success: true,
  data: [
    {id: 1, name: 'SIM Card', name_ar: 'شريحة اتصال'},
    {id: 2, name: 'Business Card', name_ar: 'بطاقة عمل'},
    {id: 3, name: 'Parking Permit', name_ar: 'تصريح وقوف سيارات'},
    {id: 4, name: 'Access Card', name_ar: 'بطاقة دخول'},
    {id: 5, name: 'Laptop', name_ar: 'جهاز كمبيوتر محمول'},
    {id: 6, name: 'Office Equipment', name_ar: 'معدات مكتبية'},
  ],
};

export const MOCK_BUSINESS_SERVICES: ApiSuccess<BusinessService[]> = {
  success: true,
  data: [
    {
      id: 1001,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Business Card Request',
      title_ar: 'طلب بطاقة عمل',
      service_type: 'Business Card',
      service_type_ar: 'بطاقة عمل',
      reason: 'New employee joining the team',
      reason_ar: 'موظف جديد يلتحق بالفريق',
      requested_date: '2026-03-20',
      status: 'pending',
      request_date: '2026-03-10',
      approval_history: [{step: 'Manager', approver: 'Khalid Nasser', status: 'pending'}],
    },
    {
      id: 1002,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Laptop Replacement',
      title_ar: 'استبدال الحاسوب المحمول',
      service_type: 'Laptop',
      service_type_ar: 'جهاز كمبيوتر محمول',
      reason: 'Old laptop needs replacement',
      reason_ar: 'الحاسوب القديم يحتاج إلى استبدال',
      requested_date: '2026-03-25',
      status: 'approved',
      request_date: '2026-02-28',
      approval_history: [
        {step: 'Manager', approver: 'Khalid Nasser', status: 'approved', date: '2026-03-01'},
        {step: 'IT', approver: 'Omar Khalid', status: 'approved', date: '2026-03-02'},
      ],
    },
    {
      id: 1003,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      title: 'Parking Permit Renewal',
      title_ar: 'تجديد تصريح وقوف السيارات',
      service_type: 'Parking Permit',
      service_type_ar: 'تصريح وقوف سيارات',
      reason: 'Assigned parking spot renewal',
      reason_ar: 'تجديد موقف السيارة المخصص',
      requested_date: '2026-04-01',
      status: 'draft',
      request_date: '2026-03-14',
      approval_history: [],
    },
    // Subordinates — visible to manager/hr/admin
    {
      id: 1004,
      employee_id: 110,
      employee: 'Fatima Al-Zahra',
      employee_ar: 'فاطمة الزهراء',
      title: 'SIM Card Request',
      title_ar: 'طلب شريحة اتصال',
      service_type: 'SIM Card',
      service_type_ar: 'شريحة اتصال',
      reason: 'Need corporate SIM for business trips',
      reason_ar: 'بحاجة إلى شريحة للسفر الرسمي',
      requested_date: '2026-03-28',
      status: 'pending',
      request_date: '2026-03-20',
      approval_history: [{step: 'Manager', approver: 'Khalid Al-Mansouri', status: 'pending'}],
    },
    {
      id: 1005,
      employee_id: 111,
      employee: 'Omar Al-Rashid',
      employee_ar: 'عمر الراشد',
      title: 'Access Card Replacement',
      title_ar: 'استبدال بطاقة الدخول',
      service_type: 'Access Card',
      service_type_ar: 'بطاقة دخول',
      reason: 'Lost access card',
      reason_ar: 'فقدان بطاقة الدخول',
      requested_date: '2026-03-22',
      status: 'approved',
      request_date: '2026-03-15',
      approval_history: [{step: 'Manager', approver: 'Khalid Al-Mansouri', status: 'approved', date: '2026-03-16'}],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 5, totalPages: 1},
};

export const MOCK_SERVICE_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 1002},
  message: 'Service request submitted.',
};
