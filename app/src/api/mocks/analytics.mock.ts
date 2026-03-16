import {ApiSuccess} from '../../types/api';

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

export const MOCK_ANALYTICS: ApiSuccess<AnalyticsData> = {
  success: true,
  data: {
    period: 'this_month',
    attendance: {
      attendance_rate: 94,
      late_rate: 12,
      absent_rate: 2,
    },
    leave: {
      total_unused_days: 87,
      financial_liability: 28500,
      at_risk_count: 3,
      at_risk_members: [
        {name: 'Omar Al-Rashid', unused_days: 19, percent: 90},
        {name: 'Fatima Khalil', unused_days: 16, percent: 76},
      ],
    },
    overtime: {
      total_hours: 45,
      members_with_ot: 6,
      total_members: 11,
      avg_hours: 7.5,
    },
    expenses: {
      total: 12500,
      pending_approval: 2300,
      top_category: 'Travel',
      top_category_ar: 'سفر',
      top_category_percent: 45,
    },
  },
};
