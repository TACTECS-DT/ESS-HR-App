export type AnnouncementPriority = 'urgent' | 'info' | 'general';

export interface Announcement {
  id: number;
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
  posted_by: string;
  posted_by_ar: string;
  date: string;
  is_pinned: boolean;
  priority: AnnouncementPriority;
}

export const MOCK_ANNOUNCEMENTS: {success: boolean; data: Announcement[]} = {
  success: true,
  data: [
    {
      id: 1,
      title: 'Office Closure — National Day',
      title_ar: 'إغلاق المكتب — اليوم الوطني',
      body: 'Please note the office will be closed on March 23rd for National Day. All offices will be closed. We wish everyone a happy National Day!',
      body_ar: 'يُرجى العلم بأن المكتب سيكون مغلقاً في 23 مارس بمناسبة اليوم الوطني. ستكون جميع المكاتب مغلقة. نتمنى للجميع يوماً وطنياً سعيداً!',
      posted_by: 'HR Department',
      posted_by_ar: 'قسم الموارد البشرية',
      date: '2026-03-12',
      is_pinned: true,
      priority: 'urgent',
    },
    {
      id: 2,
      title: 'New Health Insurance Provider',
      title_ar: 'مزود التأمين الصحي الجديد',
      body: 'We are pleased to announce a new health insurance provider starting April 1st. New cards will be distributed by HR. Please check your email for details.',
      body_ar: 'يسعدنا الإعلان عن مزود تأمين صحي جديد اعتباراً من 1 أبريل. ستوزع بطاقات جديدة من قِبَل الموارد البشرية. يرجى مراجعة بريدك الإلكتروني للتفاصيل.',
      posted_by: 'HR Department',
      posted_by_ar: 'قسم الموارد البشرية',
      date: '2026-03-10',
      is_pinned: false,
      priority: 'info',
    },
    {
      id: 3,
      title: 'Q1 Town Hall Meeting',
      title_ar: 'اجتماع الربع الأول العام',
      body: 'The Q1 Town Hall meeting will be held on March 20th at 10:00 AM in the main conference room. Attendance is mandatory for all department heads.',
      body_ar: 'سيُعقد اجتماع الربع الأول العام في 20 مارس الساعة 10:00 صباحاً في قاعة الاجتماعات الرئيسية. الحضور إلزامي لجميع رؤساء الأقسام.',
      posted_by: 'Management',
      posted_by_ar: 'الإدارة',
      date: '2026-03-09',
      is_pinned: false,
      priority: 'general',
    },
    {
      id: 4,
      title: 'Ramadan Working Hours',
      title_ar: 'ساعات العمل في رمضان',
      body: 'During the Holy Month of Ramadan, official working hours will be 9:00 AM to 3:00 PM. This applies to all departments. We wish everyone a blessed Ramadan.',
      body_ar: 'خلال شهر رمضان المبارك، ستكون ساعات العمل الرسمية من 9:00 صباحاً حتى 3:00 ظهراً. ينطبق هذا على جميع الأقسام. نتمنى للجميع رمضاناً مباركاً.',
      posted_by: 'HR Department',
      posted_by_ar: 'قسم الموارد البشرية',
      date: '2026-03-01',
      is_pinned: false,
      priority: 'info',
    },
  ],
};
