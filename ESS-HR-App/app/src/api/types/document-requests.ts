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
