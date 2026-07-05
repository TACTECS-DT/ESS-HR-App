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
