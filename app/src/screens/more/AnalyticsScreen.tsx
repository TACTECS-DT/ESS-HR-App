import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import AccessDenied from '../../components/common/AccessDenied';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AnalyticsData} from '../../api/mocks/analytics.mock';

type Period = 'this_month' | 'last_month' | 'quarter' | 'year';

function StatCard({
  label,
  value,
  color,
}: {label: string; value: string; color?: string; theme?: any}) {
  return (
    <View style={statCardStyles.item}>
      <Text style={[statCardStyles.value, {color: color ?? colors.primary}]}>{value}</Text>
      <Text style={statCardStyles.label}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  item: {alignItems: 'center', flex: 1},
  value: {fontSize: fontSize.xxl, fontWeight: '700'},
  label: {fontSize: fontSize.xs, color: colors.gray500, textAlign: 'center', marginTop: 2},
});

function ProgressBar({percent, color}: {percent: number; color: string}) {
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, {width: `${Math.min(percent, 100)}%`, backgroundColor: color}]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden', marginTop: 4},
  fill: {height: '100%', borderRadius: 3},
});

export default function AnalyticsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';
  const [period, setPeriod] = useState<Period>('this_month');
  const {canAccessAnalytics} = useRBAC();

  // Hook must be called unconditionally — disabled when no access
  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['analytics', period],
    enabled: canAccessAnalytics,
    queryFn: async () => {
      const res = await apiClient.get(`/analytics?period=${period}`);
      return isApiSuccess(res.data) ? (res.data.data as AnalyticsData) : null;
    },
  });

  if (!canAccessAnalytics) {
    return <AccessDenied />;
  }

  const periodTabs: Array<{key: Period; label: string}> = [
    {key: 'this_month', label: t('analytics.thisMonth')},
    {key: 'last_month', label: t('analytics.lastMonth')},
    {key: 'quarter', label: t('analytics.quarter')},
    {key: 'year', label: t('analytics.year')},
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('analytics.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={120} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('analytics.title')} showBack />

      {/* Period tabs */}
      <View style={[styles.tabBar, {backgroundColor: theme.surface, borderBottomColor: theme.border}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabList}>
          {periodTabs.map(tab => {
            const isActive = period === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}
                onPress={() => setPeriod(tab.key)}>
                <Text style={[styles.tabText, {color: isActive ? colors.primary : theme.textSecondary}]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>

        {data ? (
          <>
            {/* Attendance Overview */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {'📋 '}{t('analytics.attendanceOverview')}
            </Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <View style={styles.statsRow}>
                <StatCard
                  label={t('analytics.attendanceRate')}
                  value={`${data.attendance.attendance_rate}%`}
                  color={colors.success}
                />
                <StatCard
                  label={t('analytics.lateRate')}
                  value={`${data.attendance.late_rate}%`}
                  color={colors.warning}
                />
                <StatCard
                  label={t('analytics.absentRate')}
                  value={`${data.attendance.absent_rate}%`}
                  color={colors.error}
                />
              </View>
              <View style={[styles.chartPlaceholder, {backgroundColor: theme.background}]}>
                <Text style={[styles.chartText, {color: theme.textSecondary}]}>
                  {'██████████░░  '}{data.attendance.attendance_rate}{'%\n'}
                  {t('analytics.thisMonth')}
                </Text>
              </View>
            </View>

            {/* Leave Liability */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {'🏖️ '}{t('analytics.leaveLiability')}
            </Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.unusedDays')}</Text>
                <Text style={[styles.infoValue, {color: colors.error}]}>
                  {data.leave.total_unused_days} {t('analytics.days')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.financialLiability')}</Text>
                <Text style={[styles.infoValue, {color: colors.error}]}>
                  {data.leave.financial_liability.toLocaleString()} {t('common.sar')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.atRisk')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>{data.leave.at_risk_count}</Text>
              </View>
              {data.leave.at_risk_members.map((member, idx) => (
                <View key={idx} style={[styles.memberRow, {backgroundColor: theme.background}]}>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, {color: theme.text}]}>{member.name}</Text>
                    <Text style={[styles.memberSub, {color: member.percent >= 85 ? colors.error : colors.warning}]}>
                      {member.unused_days} {t('analytics.days')}
                    </Text>
                  </View>
                  <ProgressBar percent={member.percent} color={member.percent >= 85 ? colors.error : colors.warning} />
                </View>
              ))}
            </View>

            {/* Overtime Analysis */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {'⏰ '}{t('analytics.overtimeAnalysis')}
            </Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.totalOvertime')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>{data.overtime.total_hours}h</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.membersWithOT')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>
                  {data.overtime.members_with_ot} / {data.overtime.total_members}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.avgOT')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>{data.overtime.avg_hours}h</Text>
              </View>
            </View>

            {/* Expense Summary */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {'🧾 '}{t('analytics.expenseSummary')}
            </Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.totalExpenses')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>
                  {data.expenses.total.toLocaleString()} {t('common.sar')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.pendingApproval')}</Text>
                <Text style={[styles.infoValue, {color: colors.warning}]}>
                  {data.expenses.pending_approval.toLocaleString()} {t('common.sar')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('analytics.topCategory')}</Text>
                <Text style={[styles.infoValue, {color: theme.text}]}>
                  {isAr ? data.expenses.top_category_ar : data.expenses.top_category}
                  {' ('}
                  {data.expenses.top_category_percent}
                  {'%)'}
                </Text>
              </View>
            </View>

            {/* Export button */}
            <TouchableOpacity
              style={[styles.exportBtn, {borderColor: colors.primary}]}>
              <Text style={[styles.exportText, {color: colors.primary}]}>{'📥  '}{t('analytics.export')}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  card: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  statsRow: {flexDirection: 'row', justifyContent: 'space-around'},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  infoLabel: {fontSize: fontSize.sm, flex: 1},
  infoValue: {fontSize: fontSize.sm, fontWeight: '600'},
  chartPlaceholder: {borderRadius: radius.sm, padding: spacing.md, alignItems: 'center'},
  chartText: {fontSize: fontSize.xs, textAlign: 'center', lineHeight: 18},
  memberRow: {borderRadius: radius.sm, padding: spacing.sm, gap: 4},
  memberInfo: {flexDirection: 'row', justifyContent: 'space-between'},
  memberName: {fontSize: fontSize.sm, fontWeight: '500'},
  memberSub: {fontSize: fontSize.xs, fontWeight: '600'},
  exportBtn: {borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center'},
  exportText: {fontSize: fontSize.sm, fontWeight: '700'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
