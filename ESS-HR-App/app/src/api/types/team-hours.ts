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
