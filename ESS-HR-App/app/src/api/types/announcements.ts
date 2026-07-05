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
