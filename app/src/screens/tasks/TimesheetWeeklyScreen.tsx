import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
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
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Nav = StackNavigationProp<TasksStackParamList>;
type PeriodFilter = 'this_week' | 'last_week' | 'this_month';

const PROJECT_COLORS = [colors.primary, colors.success, colors.warning, colors.info, '#8b5cf6', '#ec4899'];
function projectColor(idx: number): string {
  return PROJECT_COLORS[idx % PROJECT_COLORS.length] ?? colors.primary;
}

// Day of week labels (Mon=1...Fri=5)
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

export default function TimesheetWeeklyScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [period, setPeriod] = useState<PeriodFilter>('this_week');

  const {data, isLoading, refetch} = useQuery({
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
        <ScreenHeader title={t('tasks.timesheetWeekly')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={70} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  const periodTabs: Array<{key: PeriodFilter; label: string}> = [
    {key: 'this_week', label: t('timesheets.thisWeek')},
    {key: 'last_week', label: t('timesheets.lastWeek')},
    {key: 'this_month', label: t('timesheets.thisMonth')},
  ];

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('tasks.timesheetWeekly')} showBack />

      {/* Period filter tabs */}
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

      {/* Weekly summary card */}
      {data && data.length > 0 ? (
        <View style={[styles.weeklyCard, {backgroundColor: colors.primary}]}>
          {/* Week range label */}
          <Text style={styles.weekRangeLabel}>{weekRange}</Text>

          {/* Big total */}
          <Text style={styles.weeklyTotal}>{weeklyTotal}h</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${goalPercent}%`}]} />
          </View>
          <Text style={styles.goalText}>{t('timesheets.weekGoal', {percent: goalPercent})}</Text>

          {/* M-T-W-T-F bar chart */}
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

      <FlatList
        data={data}
        keyExtractor={item => item.date}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState title={t('common.noData')} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('TimesheetDaily', {date: item.date})}>
            <View style={styles.cardRow}>
              <Text style={[styles.dateText, {color: theme.text}]}>{item.date}</Text>
              <View style={[styles.hoursBadge, {backgroundColor: colors.primary + '22'}]}>
                <Text style={{color: colors.primary, fontSize: fontSize.md, fontWeight: '700'}}>
                  {item.total_hours}h
                </Text>
              </View>
            </View>
            {/* Project dots */}
            <View style={styles.projectDots}>
              {item.entries.map((entry, idx) => (
                <View key={entry.id} style={styles.projectDot}>
                  <View style={[styles.dot, {backgroundColor: projectColor(idx)}]} />
                  <Text style={[styles.projectName, {color: theme.textSecondary}]} numberOfLines={1}>
                    {entry.task_name}
                  </Text>
                  <Text style={[styles.projectHours, {color: projectColor(idx)}]}>{entry.hours}h</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  weeklyCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
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
  list: {padding: spacing.md, gap: spacing.sm},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  cardRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  dateText: {fontSize: fontSize.md, fontWeight: '600'},
  hoursBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  projectDots: {gap: 6},
  projectDot: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  dot: {width: 8, height: 8, borderRadius: 4},
  projectName: {fontSize: fontSize.xs, flex: 1},
  projectHours: {fontSize: fontSize.xs, fontWeight: '700'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
