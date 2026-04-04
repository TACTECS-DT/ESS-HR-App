import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useNavigation} from '@react-navigation/native';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';
import type {StackNavigationProp} from '@react-navigation/stack';

type Nav = StackNavigationProp<TasksStackParamList>;
type Route = RouteProp<TasksStackParamList, 'TimesheetDaily'>;

const ENTRY_COLORS = [colors.primary, colors.success, colors.warning, colors.info];

export default function TimesheetDailyScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const targetDate = route.params?.date;

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['timesheets', targetDate],
    queryFn: async () => {
      const url = targetDate ? `/timesheets?date=${targetDate}` : '/timesheets';
      const res = await apiClient.get(url);
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  const dailyData = targetDate
    ? data?.find(d => d.date === targetDate)
    : data?.[0];

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('tasks.timesheetDaily')} showBack />
        <View style={styles.skeletons}>
          <LoadingSkeleton height={80} style={styles.skeleton} />
          <LoadingSkeleton height={120} style={styles.skeleton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={dailyData ? dailyData.date : t('tasks.timesheetDaily')} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>

        {dailyData ? (
          <>
            {/* Day total card */}
            <View style={[styles.summaryBigCard, {backgroundColor: colors.primary}]}>
              <Text style={styles.summaryEmployeeLabel}>👤 {isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}</Text>
              <Text style={styles.summaryBigLabel}>{t('timesheets.totalHours')}</Text>
              <Text style={styles.summaryBigHours}>{dailyData.total_hours}h</Text>
              <Text style={styles.summaryBigSub}>{dailyData.entries.length} {t('tasks.entries')}</Text>
            </View>

            {/* Time entries */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.entries')}</Text>
            <Card style={styles.entriesCard}>
              {dailyData.entries.map((entry, idx) => {
                const col = ENTRY_COLORS[idx % ENTRY_COLORS.length] ?? colors.primary;
                return (
                  <View key={entry.id} style={[styles.entryRow, {borderBottomColor: theme.border}]}>
                    <View style={[styles.entryColorBar, {backgroundColor: col}]} />
                    <View style={styles.entryInfo}>
                      <Text style={[styles.entryTask, {color: theme.text}]}>{entry.task_name}</Text>
                      <Text style={[styles.entryProject, {color: theme.textSecondary}]}>{entry.project}</Text>
                      {entry.description ? (
                        <Text style={[styles.entryDesc, {color: theme.textSecondary}]} numberOfLines={1}>
                          {entry.description}
                        </Text>
                      ) : null}
                      {entry.time_start && entry.time_end ? (
                        <Text style={[styles.entryTime, {color: theme.textSecondary}]}>
                          {entry.time_start} – {entry.time_end}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.hoursBadge, {backgroundColor: col + '22'}]}>
                      <Text style={{color: col, fontSize: fontSize.sm, fontWeight: '700'}}>
                        {entry.hours}h
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* By Project section */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('timesheets.byProject')}</Text>
            <Card style={styles.breakdownCard}>
              {dailyData.entries.map((entry, idx) => {
                const pct = Math.round((entry.hours / dailyData.total_hours) * 100);
                const col = ENTRY_COLORS[idx % ENTRY_COLORS.length] ?? colors.primary;
                return (
                  <View key={entry.id} style={styles.breakdownRow}>
                    <View style={styles.breakdownInfo}>
                      <View style={[styles.colorDot, {backgroundColor: col}]} />
                      <Text style={[styles.breakdownName, {color: theme.text}]} numberOfLines={1}>
                        {entry.project}
                      </Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={[styles.breakdownHours, {color: col, fontWeight: '700'}]}>{entry.hours}h</Text>
                      <Text style={[styles.breakdownPct, {color: theme.textSecondary}]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* Add entry button */}
            <TouchableOpacity
              style={[styles.addEntryBtn, {borderColor: colors.primary}]}
              onPress={() => navigation.navigate('LogTime', {taskId: 0, taskName: dailyData.date})}>
              <Text style={[styles.addEntryText, {color: colors.primary}]}>
                {'+ '}{t('timesheets.addEntry')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <EmptyState title={t('common.noData')} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  summaryBigCard: {borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.xs},
  summaryEmployeeLabel: {color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm, fontWeight: '600'},
  summaryBigLabel: {color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm},
  summaryBigHours: {color: '#fff', fontSize: 52, fontWeight: '700'},
  summaryBigSub: {color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs},
  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  entriesCard: {gap: 0, padding: 0},
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  entryColorBar: {width: 4, alignSelf: 'stretch', borderRadius: 2, marginTop: 2},
  entryInfo: {flex: 1, gap: 2},
  entryTask: {fontSize: fontSize.md, fontWeight: '600'},
  entryProject: {fontSize: fontSize.sm},
  entryDesc: {fontSize: fontSize.xs},
  entryTime: {fontSize: fontSize.xs, marginTop: 2},
  hoursBadge: {paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'center'},
  breakdownCard: {gap: spacing.sm},
  breakdownRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  breakdownInfo: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1},
  colorDot: {width: 10, height: 10, borderRadius: 5},
  breakdownName: {fontSize: fontSize.sm, flex: 1},
  breakdownRight: {flexDirection: 'row', gap: spacing.sm, alignItems: 'center'},
  breakdownHours: {fontSize: fontSize.sm},
  breakdownPct: {fontSize: fontSize.sm},
  addEntryBtn: {borderWidth: 1.5, borderRadius: radius.md, borderStyle: 'dashed', padding: spacing.md, alignItems: 'center'},
  addEntryText: {fontSize: fontSize.sm, fontWeight: '700'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
