import {ApiSuccess} from '../../types/api';

export interface TeamMemberHours {
  id: number;
  name: string;
  job_title: string;
  job_title_ar: string;
  initials: string;
  hours: number;
  target_hours: number;
  percent: number;
}

export interface TeamHoursSummary {
  week_label: string;
  week_number: number;
  total_hours: number;
  avg_per_person: number;
  below_target_count: number;
  members: TeamMemberHours[];
}

export const MOCK_TEAM_HOURS: ApiSuccess<TeamHoursSummary> = {
  success: true,
  data: {
    week_label: '8 – 14 Mar 2026',
    week_number: 11,
    total_hours: 285,
    avg_per_person: 36,
    below_target_count: 2,
    members: [
      {id: 1, name: 'Mohammed Khalil', job_title: 'Senior Developer', job_title_ar: 'مطور أول', initials: 'MK', hours: 42, target_hours: 40, percent: 105},
      {id: 2, name: 'Sara Ahmed', job_title: 'UI/UX Designer', job_title_ar: 'مصممة UI/UX', initials: 'SA', hours: 38.5, target_hours: 40, percent: 96},
      {id: 3, name: 'Omar Tariq', job_title: 'Backend Developer', job_title_ar: 'مطور خلفي', initials: 'OT', hours: 36, target_hours: 40, percent: 90},
      {id: 4, name: 'Nour Rami', job_title: 'QA Engineer', job_title_ar: 'مهندسة ضمان الجودة', initials: 'NR', hours: 32, target_hours: 40, percent: 80},
      {id: 5, name: 'Khalid Nasser', job_title: 'DevOps', job_title_ar: 'DevOps', initials: 'KN', hours: 40, target_hours: 40, percent: 100},
      {id: 6, name: 'Layla Hassan', job_title: 'Product Manager', job_title_ar: 'مدير المنتج', initials: 'LH', hours: 28, target_hours: 40, percent: 70},
      {id: 7, name: 'Faisal Al-Otaibi', job_title: 'Frontend Developer', job_title_ar: 'مطور واجهة', initials: 'FO', hours: 38, target_hours: 40, percent: 95},
      {id: 8, name: 'Hind Al-Mutairi', job_title: 'Business Analyst', job_title_ar: 'محللة أعمال', initials: 'HM', hours: 30.5, target_hours: 40, percent: 76},
    ],
  },
};
