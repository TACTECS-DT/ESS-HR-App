import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import type {StackNavigationProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Nav = StackNavigationProp<TasksStackParamList>;

export default function TimesheetWeeklyScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  const weeklyTotal = (data ?? []).reduce((sum, day) => sum + day.total_hours, 0);

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

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('tasks.timesheetWeekly')} showBack />

      {data && data.length > 0 ? (
        <Card style={[styles.weeklyTotalCard, {marginHorizontal: spacing.md, marginTop: spacing.md}]}>
          <View style={styles.weeklyTotalRow}>
            <Text style={[styles.weeklyTotalLabel, {color: theme.textSecondary}]}>
              {t('tasks.weeklyTotal')}
            </Text>
            <Text style={[styles.weeklyTotalValue, {color: colors.primary}]}>
              {weeklyTotal}h
            </Text>
          </View>
        </Card>
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
            <Text style={[styles.entryCount, {color: theme.textSecondary}]}>
              {item.entries.length} {t('tasks.entries')}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: spacing.md, gap: spacing.sm},
  weeklyTotalCard: {},
  weeklyTotalRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  weeklyTotalLabel: {fontSize: fontSize.md},
  weeklyTotalValue: {fontSize: fontSize.xxl, fontWeight: '700'},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  dateText: {fontSize: fontSize.md, fontWeight: '600'},
  hoursBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  entryCount: {fontSize: fontSize.sm},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
