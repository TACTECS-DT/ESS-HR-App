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

export const MOCK_NOTIFICATIONS: {success: boolean; data: AppNotification[]} = {
  success: true,
  data: [
    {
      id: 1,
      type: 'leave',
      title: 'Leave Request Approved',
      title_ar: 'تمت الموافقة على طلب الإجازة',
      body: 'Your annual leave request for Mar 15–17 has been approved.',
      body_ar: 'تمت الموافقة على طلب إجازتك السنوية للفترة 15-17 مارس.',
      is_read: false,
      created_at: '2026-03-12T09:00:00Z',
    },
    {
      id: 2,
      type: 'payslip',
      title: 'Payslip Available',
      title_ar: 'قسيمة الراتب متاحة',
      body: 'Your payslip for February 2026 is now available.',
      body_ar: 'قسيمة راتبك لشهر فبراير 2026 متاحة الآن.',
      is_read: false,
      created_at: '2026-03-10T08:00:00Z',
    },
    {
      id: 3,
      type: 'expense',
      title: 'Expense Report Approved',
      title_ar: 'تمت الموافقة على تقرير المصروفات',
      body: 'Your expense report for SAR 450 has been approved.',
      body_ar: 'تمت الموافقة على تقرير مصروفاتك بمبلغ 450 ريال.',
      is_read: true,
      created_at: '2026-03-08T14:30:00Z',
    },
    {
      id: 4,
      type: 'task',
      title: 'New Task Assigned',
      title_ar: 'تم تعيين مهمة جديدة',
      body: 'You have been assigned a new task: Q1 Report Review.',
      body_ar: 'تم تعيين مهمة جديدة لك: مراجعة تقرير الربع الأول.',
      is_read: true,
      created_at: '2026-03-07T11:00:00Z',
    },
    {
      id: 5,
      type: 'loan',
      title: 'Loan Application Update',
      title_ar: 'تحديث طلب القرض',
      body: 'Your loan application is under review by HR.',
      body_ar: 'طلب قرضك قيد المراجعة من قِبل الموارد البشرية.',
      is_read: true,
      created_at: '2026-03-05T10:15:00Z',
    },
    {
      id: 6,
      type: 'announcement',
      title: 'Company Holiday',
      title_ar: 'عطلة الشركة',
      body: 'The office will be closed on March 23rd for National Day.',
      body_ar: 'سيكون المكتب مغلقاً في 23 مارس بمناسبة اليوم الوطني.',
      is_read: true,
      created_at: '2026-03-03T09:00:00Z',
    },
  ],
};
