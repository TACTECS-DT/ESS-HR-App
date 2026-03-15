import React, {useState} from 'react';
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
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {Task, TaskStage} from '../../api/mocks/tasks.mock';

type Nav = StackNavigationProp<TasksStackParamList>;

const STAGES: Array<TaskStage | 'all'> = ['all', 'backlog', 'in_progress', 'review', 'done'];

const PRIORITY_COLORS: Record<string, string> = {
  low: colors.gray500,
  normal: colors.info,
  high: colors.warning,
  urgent: colors.error,
};

export default function TaskListScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<TaskStage | 'all'>('all');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const filtered = filter === 'all' ? data : data?.filter(t => t.stage === filter);

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('tasks.title')} />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={90} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={t('tasks.title')}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('TimesheetWeekly')}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: '600'}}>
              {t('tasks.timesheet')}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.filterRow}>
        {STAGES.map(stage => (
          <TouchableOpacity
            key={stage}
            style={[
              styles.filterChip,
              filter === stage && {backgroundColor: colors.primary},
              {borderColor: filter === stage ? colors.primary : theme.border},
            ]}
            onPress={() => setFilter(stage)}>
            <Text style={{
              color: filter === stage ? colors.white : theme.textSecondary,
              fontSize: fontSize.xs,
              fontWeight: '600',
            }}>
              {stage === 'all' ? t('common.filter') : t(`tasks.stage.${stage}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState title={t('common.noData')} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('TaskDetail', {id: item.id})}>
            <View style={styles.cardTop}>
              <Text style={[styles.taskName, {color: theme.text}]} numberOfLines={2}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.priorityBadge,
                  {backgroundColor: (PRIORITY_COLORS[item.priority] ?? colors.gray500) + '22'},
                ]}>
                <Text style={{
                  color: PRIORITY_COLORS[item.priority] ?? colors.gray500,
                  fontSize: fontSize.xs,
                  fontWeight: '700',
                }}>
                  {t(`tasks.priority.${item.priority}`)}
                </Text>
              </View>
            </View>
            <Text style={[styles.project, {color: theme.textSecondary}]}>{item.project}</Text>
            <View style={styles.cardBottom}>
              <StatusChip status={item.stage} label={t(`tasks.stage.${item.stage}`)} />
              {item.deadline ? (
                <Text style={[styles.deadline, {color: theme.textSecondary}]}>
                  {t('tasks.deadline')}: {item.deadline}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: spacing.md, gap: spacing.sm},
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  taskName: {fontSize: fontSize.md, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  project: {fontSize: fontSize.sm},
  cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  deadline: {fontSize: fontSize.xs},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
