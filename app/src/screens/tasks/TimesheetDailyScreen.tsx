import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Route = RouteProp<TasksStackParamList, 'TimesheetDaily'>;

export default function TimesheetDailyScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
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
      <ScreenHeader title={t('tasks.timesheetDaily')} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>

        {dailyData ? (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: colors.primary}]}>
                    {dailyData.date}
                  </Text>
                  <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>
                    {t('common.date')}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: colors.success}]}>
                    {dailyData.total_hours}h
                  </Text>
                  <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>
                    {t('tasks.totalHours')}
                  </Text>
                </View>
              </View>
            </Card>

            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('tasks.entries')}
            </Text>

            {dailyData.entries.map(entry => (
              <Card key={entry.id} style={styles.entryCard}>
                <Text style={[styles.entryTask, {color: theme.text}]}>{entry.task_name}</Text>
                <Text style={[styles.entryProject, {color: theme.textSecondary}]}>{entry.project}</Text>
                <View style={styles.entryMeta}>
                  <View style={[styles.hoursBadge, {backgroundColor: colors.primary + '22'}]}>
                    <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: '700'}}>
                      {entry.hours}h
                    </Text>
                  </View>
                  {entry.description ? (
                    <Text style={[styles.entryDesc, {color: theme.textSecondary}]} numberOfLines={2}>
                      {entry.description}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))}
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
  content: {padding: spacing.md, gap: spacing.md},
  summaryCard: {},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {alignItems: 'center'},
  summaryValue: {fontSize: fontSize.xl, fontWeight: '700'},
  summaryLabel: {fontSize: fontSize.xs},
  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  entryCard: {gap: spacing.xs},
  entryTask: {fontSize: fontSize.md, fontWeight: '600'},
  entryProject: {fontSize: fontSize.sm},
  entryMeta: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap'},
  hoursBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  entryDesc: {fontSize: fontSize.sm, flex: 1},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
