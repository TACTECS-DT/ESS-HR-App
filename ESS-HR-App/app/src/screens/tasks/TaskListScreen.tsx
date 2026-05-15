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
import TimerBar from '../../components/common/TimerBar';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {Task, TaskStage} from '../../api/mocks/tasks.mock';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<TasksStackParamList>;

const STAGES: Array<TaskStage | 'all' | 'overdue'> = ['all', 'in_progress', 'overdue', 'done', 'backlog', 'review'];

function isOverdue(task: Task): boolean {
  if (!task.deadline) {return false;}
  return task.stage !== 'done' && task.deadline < new Date().toISOString().split('T')[0];
}

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
  const [filter, setFilter] = useState<TaskStage | 'all' | 'overdue'>('all');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.tasks.list);
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const allTasks = data ?? [];
  const filtered = filter === 'all'
    ? allTasks
    : filter === 'overdue'
    ? allTasks.filter(isOverdue)
    : allTasks.filter(tk => tk.stage === filter);

  const stats = {
    total: allTasks.length,
    inProgress: allTasks.filter(tk => tk.stage === 'in_progress').length,
    overdue: allTasks.filter(isOverdue).length,
    done: allTasks.filter(tk => tk.stage === 'done').length,
  };

  const statItems = [
    {id: 'total', val: stats.total, color: colors.primary, label: t('tasks.statsTotal')},
    {id: 'inProgress', val: stats.inProgress, color: colors.warning, label: t('tasks.statsInProgress')},
    {id: 'overdue', val: stats.overdue, color: colors.error, label: t('tasks.statsOverdue')},
    {id: 'done', val: stats.done, color: colors.success, label: t('tasks.statsDone')},
  ];

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

      <TimerBar />

      {/* Stats summary */}
      <View style={[styles.statsCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
        {statItems.map(s => (
          <View key={s.id} style={styles.statItem}>
            <Text style={[styles.statValue, {color: s.color}]}>{s.val}</Text>
            <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{s.label}</Text>
          </View>
        ))}
      </View>

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
              {stage === 'all'
                ? t('common.all')
                : stage === 'overdue'
                ? t('tasks.overdue')
                : t(`tasks.stage.${stage}`)}
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
            <View style={[styles.priorityBar, {backgroundColor: PRIORITY_COLORS[item.priority] ?? colors.gray500}]} />
            <View style={styles.cardInner}>
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
              <Text style={[styles.assignee, {color: theme.textSecondary}]}>👤 {item.assigned_to}</Text>
              <View style={styles.cardBottom}>
                <StatusChip status={item.stage} label={t(`tasks.stage.${item.stage}`)} />
                {item.deadline ? (
                  <Text style={[styles.deadline, {color: theme.textSecondary}]}>
                    {t('tasks.deadline')}: {item.deadline}
                  </Text>
                ) : null}
              </View>
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
  card: {borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', gap: spacing.xs},
  priorityBar: {height: 4, marginHorizontal: 0},
  cardInner: {padding: spacing.md, gap: spacing.xs},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  taskName: {fontSize: fontSize.md, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  project: {fontSize: fontSize.sm},
  assignee: {fontSize: fontSize.xs},
  cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  deadline: {fontSize: fontSize.xs},
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  statItem: {flex: 1, alignItems: 'center', paddingVertical: spacing.xs},
  statValue: {fontSize: fontSize.xl, fontWeight: '700'},
  statLabel: {fontSize: fontSize.xs, textAlign: 'center', marginTop: 2},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
