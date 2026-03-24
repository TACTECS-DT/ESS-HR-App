import {ApiSuccess} from '../../types/api';

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'refused';

export interface DocumentType {
  id: number;
  name: string;
  name_ar: string;
}

export interface DocumentRequest {
  id: number;
  employee_id: number;
  employee: string;
  employee_ar: string;
  document_type: string;
  document_type_ar: string;
  return_date: string;
  status: DocumentStatus;
  request_date: string;
  reason?: string;
  approval_history: Array<{step: string; approver: string; status: string; date?: string}>;
}

export const MOCK_DOCUMENT_TYPES: ApiSuccess<DocumentType[]> = {
  success: true,
  data: [
    {id: 1, name: 'Passport', name_ar: 'جواز السفر'},
    {id: 2, name: 'National ID', name_ar: 'الهوية الوطنية'},
    {id: 3, name: 'Iqama', name_ar: 'الإقامة'},
    {id: 4, name: 'Driving License', name_ar: 'رخصة القيادة'},
    {id: 5, name: 'Educational Certificate', name_ar: 'الشهادة الدراسية'},
  ],
};

export const MOCK_DOCUMENT_REQUESTS: ApiSuccess<DocumentRequest[]> = {
  success: true,
  data: [
    {
      id: 801,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      document_type: 'Passport',
      document_type_ar: 'جواز السفر',
      return_date: '2026-04-01',
      status: 'approved',
      request_date: '2026-03-01',
      reason: 'Travel for official business',
      approval_history: [{step: 'HR', approver: 'Fatima Hassan', status: 'approved', date: '2026-03-02'}],
    },
    {
      id: 802,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      document_type: 'National ID',
      document_type_ar: 'الهوية الوطنية',
      return_date: '2026-03-20',
      status: 'pending',
      request_date: '2026-03-10',
      reason: 'Needed for bank account opening',
      approval_history: [{step: 'HR', approver: 'Fatima Hassan', status: 'pending'}],
    },
    {
      id: 803,
      employee_id: 100,
      employee: 'Ahmed Al-Farsi',
      employee_ar: 'أحمد الفارسي',
      document_type: 'Iqama',
      document_type_ar: 'الإقامة',
      return_date: '2026-04-10',
      status: 'draft',
      request_date: '2026-03-14',
      reason: 'Iqama renewal process',
      approval_history: [],
    },
    // HR officer sees all employees
    {
      id: 804,
      employee_id: 111,
      employee: 'Omar Al-Rashid',
      employee_ar: 'عمر الراشد',
      document_type: 'Iqama',
      document_type_ar: 'الإقامة',
      return_date: '2026-04-15',
      status: 'pending',
      request_date: '2026-03-18',
      reason: 'Iqama renewal',
      approval_history: [{step: 'HR', approver: 'Sara Al-Amin', status: 'pending'}],
    },
  ],
  pagination: {page: 1, pageSize: 10, total: 4, totalPages: 1},
};

export const MOCK_DOCUMENT_REQUEST_CREATE_SUCCESS: ApiSuccess<{id: number}> = {
  success: true,
  data: {id: 802},
  message: 'Document request submitted.',
};
