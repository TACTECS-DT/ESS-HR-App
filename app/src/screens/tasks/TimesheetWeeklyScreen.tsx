import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import type {StackNavigationProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Nav = StackNavigationProp<TasksStackParamList>;
type PeriodFilter = 'this_week' | 'last_week' | 'this_month' | 'custom';

const PROJECT_COLORS = [colors.primary, colors.success, colors.warning, colors.info, '#8b5cf6', '#ec4899'];
function projectColor(idx: number): string {
  return PROJECT_COLORS[idx % PROJECT_COLORS.length] ?? colors.primary;
}

const DAY_LABEL_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
const DAY_JS_INDICES = [1, 2, 3, 4, 5];

function getWeekRange(data: DailyTimesheetSummary[]): string {
  if (data.length === 0) {return '';}
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.date ?? '';
  const end = sorted[sorted.length - 1]?.date ?? '';
  if (start === end) {return start;}
  return `${start}  –  ${end}`;
}

function formatDayHeader(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {weekday: 'long', day: 'numeric', month: 'long'});
  } catch {
    return dateStr;
  }
}

export default function TimesheetWeeklyScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const {canAccessTeamHours} = useRBAC();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const [period, setPeriod] = useState<PeriodFilter>('this_week');

  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  const weeklyTotal = (data ?? []).reduce((sum, day) => sum + day.total_hours, 0);
  const goalPercent = Math.min(Math.round((weeklyTotal / 40) * 100), 100);
  const weekRange = getWeekRange(data ?? []);

  // Build M-T-W-T-F bar data
  const barData = DAY_LABEL_KEYS.map((key, idx) => {
    const jsDay = DAY_JS_INDICES[idx] ?? 1;
    const entry = (data ?? []).find(d => {
      const date = new Date(d.date);
      return date.getDay() === jsDay;
    });
    return {key, hours: entry?.total_hours ?? 0};
  });
  const maxBarHours = Math.max(...barData.map(b => b.hours), 1);

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('tasks.timesheetWeekly')} showBack rightIcon="📊" />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={70} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  const periodTabs: Array<{key: PeriodFilter; label: string}> = [
    {key: 'this_week',  label: t('timesheets.thisWeek')},
    {key: 'last_week',  label: t('timesheets.lastWeek')},
    {key: 'this_month', label: t('timesheets.thisMonth')},
    {key: 'custom',     label: t('timesheets.custom')},
  ];

  const sortedData = [...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('tasks.timesheetWeekly')} showBack rightIcon="📊" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>

        {/* Weekly summary card */}
        {data && data.length > 0 ? (
          <View style={[styles.weeklyCard, {backgroundColor: colors.primary}]}>
            <Text style={styles.weekEmployeeLabel}>👤 {isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}</Text>
            <Text style={styles.weekRangeLabel}>{weekRange}</Text>
            <Text style={styles.weeklyTotal}>{weeklyTotal}h</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${goalPercent}%`}]} />
            </View>
            <Text style={styles.goalText}>{t('timesheets.weekGoal', {percent: goalPercent})}</Text>
            <View style={styles.barChart}>
              {barData.map(bar => {
                const barHeight = maxBarHours > 0 ? Math.max(4, (bar.hours / maxBarHours) * 44) : 4;
                return (
                  <View key={bar.key} style={styles.barColumn}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.barFill, {height: barHeight, backgroundColor: bar.hours > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'}]} />
                    </View>
                    <Text style={styles.barLabel}>{t(`timesheets.${bar.key}`)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Team Hours shortcut — manager/hr/admin only */}
        {canAccessTeamHours ? (
          <TouchableOpacity
            style={[styles.teamHoursBtn, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('TeamHours')}>
            <Text style={[styles.teamHoursBtnText, {color: colors.primary}]}>
              {'👥 '}{t('tasks.teamHours', 'Team Hours')}
            </Text>
            <Text style={{color: theme.textSecondary, fontSize: 14}}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Period filter tabs — below the summary card */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, {backgroundColor: theme.surface, borderBottomColor: theme.border}]}
          contentContainerStyle={styles.tabList}>
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

        {/* Entries grouped by day */}
        <View style={styles.entriesList}>
          {sortedData.length === 0 ? (
            <EmptyState title={t('common.noData')} />
          ) : (
            sortedData.map((day, dayIdx) => (
              <View key={day.date}>
                {/* Day header */}
                <TouchableOpacity
                  style={[styles.dayHeader, {borderBottomColor: colors.primary}]}
                  onPress={() => navigation.navigate('TimesheetDaily', {date: day.date})}>
                  <Text style={[styles.dayHeaderDate, {color: theme.text}]}>
                    {formatDayHeader(day.date)}
                  </Text>
                  <Text style={[styles.dayHeaderHours, {color: colors.primary}]}>
                    {day.total_hours}h
                  </Text>
                </TouchableOpacity>

                {/* Day entries */}
                {day.entries.map((entry, idx) => {
                  const col = projectColor(dayIdx * 10 + idx);
                  return (
                    <View key={entry.id} style={[styles.entryRow, {borderBottomColor: theme.border}]}>
                      <View style={[styles.projectDot, {backgroundColor: col}]} />
                      <View style={styles.entryInfo}>
                        <Text style={[styles.entryTask, {color: theme.text}]} numberOfLines={1}>
                          {entry.task_name}
                        </Text>
                        <Text style={[styles.entryProject, {color: theme.textSecondary}]}>
                          {entry.project}
                        </Text>
                      </View>
                      <Text style={[styles.entryHours, {color: theme.text}]}>{entry.hours}h</Text>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('LogTime', {taskId: 0, taskName: ''})}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  weeklyCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  weekEmployeeLabel: {color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm, fontWeight: '600'},
  weekRangeLabel: {color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs},
  weeklyTotal: {color: '#fff', fontSize: 48, fontWeight: '700'},
  progressTrack: {width: '100%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden'},
  progressFill: {height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)'},
  goalText: {color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs},
  barChart: {flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: spacing.sm},
  barColumn: {alignItems: 'center', gap: 4, flex: 1},
  barWrapper: {height: 48, justifyContent: 'flex-end', width: '60%'},
  barFill: {borderRadius: 3, width: '100%'},
  barLabel: {color: 'rgba(255,255,255,0.7)', fontSize: 10},
  teamHoursBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  teamHoursBtnText: {fontSize: fontSize.sm, fontWeight: '600'},
  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  entriesList: {paddingHorizontal: spacing.md, paddingBottom: 80},
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    marginTop: spacing.md,
  },
  dayHeaderDate: {fontSize: fontSize.sm, fontWeight: '700'},
  dayHeaderHours: {fontSize: fontSize.sm, fontWeight: '700'},
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  projectDot: {width: 10, height: 10, borderRadius: 5, flexShrink: 0},
  entryInfo: {flex: 1, gap: 2},
  entryTask: {fontSize: fontSize.sm, fontWeight: '500'},
  entryProject: {fontSize: fontSize.xs},
  entryHours: {fontSize: fontSize.sm, fontWeight: '700'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    zIndex: 10,
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
