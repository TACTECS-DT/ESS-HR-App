export interface AnalyticsAttendance {
  attendance_rate: number;
  late_rate: number;
  absent_rate: number;
}

export interface LeaveAtRiskMember {
  name: string;
  unused_days: number;
  percent: number;
}

export interface AnalyticsLeave {
  total_unused_days: number;
  financial_liability: number;
  at_risk_count: number;
  at_risk_members: LeaveAtRiskMember[];
}

export interface AnalyticsOvertime {
  total_hours: number;
  members_with_ot: number;
  total_members: number;
  avg_hours: number;
}

export interface AnalyticsExpense {
  total: number;
  pending_approval: number;
  top_category: string;
  top_category_ar: string;
  top_category_percent: number;
}

export interface AnalyticsData {
  period: string;
  attendance: AnalyticsAttendance;
  leave: AnalyticsLeave;
  overtime: AnalyticsOvertime;
  expenses: AnalyticsExpense;
}
