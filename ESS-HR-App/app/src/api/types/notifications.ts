export interface AppNotification {
  id: number;
  type: 'leave' | 'payslip' | 'expense' | 'announcement' | 'task' | 'loan';
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
  is_read: boolean;
  created_at: string;
}
