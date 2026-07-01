export type ApprovalType = 'leave' | 'expense' | 'loan' | 'advance_salary' | 'hr_request' | 'business_service';

export type HRRequestRecordType = 'hr_letter' | 'document_request' | 'experience_cert';

export interface PendingApproval {
  id: number;
  type: ApprovalType;
  record_type?: HRRequestRecordType;
  employee_name: string;
  description: string;
  request_date?: string;
  state?: string;
}
