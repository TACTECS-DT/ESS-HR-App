import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {useTheme} from '../../hooks/useTheme';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {useAppSelector} from '../../hooks/useAppSelector';
import {startTimer, stopTimer, resumeTimer} from '../../store/slices/timerSlice';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {Task, TaskStage} from '../../api/mocks/tasks.mock';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Route = RouteProp<TasksStackParamList, 'TaskDetail'>;
type Nav = StackNavigationProp<TasksStackParamList>;

const STAGES: TaskStage[] = ['backlog', 'in_progress', 'review', 'done'];

const PRIORITY_COLORS: Record<string, string> = {
  low: colors.gray500,
  normal: colors.info,
  high: colors.warning,
  urgent: colors.error,
};

export default function TaskDetailScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const timerState = useAppSelector(state => state.timer);
  const {id} = route.params;
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const task = tasks?.find(tk => tk.id === id);

  const {data: timesheets} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  // Collect all entries for this task
  const taskEntries = (timesheets ?? [])
    .flatMap(day => day.entries)
    .filter(e => e.task_id === id);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayHours = (timesheets ?? [])
    .filter(day => day.date === todayStr)
    .flatMap(day => day.entries)
    .filter(e => e.task_id === id)
    .reduce((sum, e) => sum + e.hours, 0);

  const stageMutation = useMutation({
    mutationFn: async (stage: TaskStage) => {
      await apiClient.patch(`/tasks/${id}`, {stage});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tasks']});
    },
  });

  function handleStartTimer() {
    if (!task) {return;}
    if (isTimerRunningForThis) {
      dispatch(stopTimer());
      return;
    }
    if (timerState.paused && timerState.taskId === id) {
      dispatch(resumeTimer());
      return;
    }
    if (timerState.running) {
      dispatch(stopTimer());
    }
    dispatch(startTimer({taskId: id, taskName: task.name}));
  }

  if (!task) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('tasks.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  const isTimerRunningForThis = timerState.running && timerState.taskId === id;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('tasks.taskDetail')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <Card style={styles.card}>
          <Text style={[styles.taskName, {color: theme.text}]}>{task.name}</Text>
          <Text style={[styles.project, {color: theme.textSecondary}]}>{'📁 '}{task.project}</Text>

          <View style={styles.row}>
            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>{t('tasks.priority.label')}</Text>
            <View style={[styles.priorityBadge, {backgroundColor: (PRIORITY_COLORS[task.priority] ?? colors.gray500) + '22'}]}>
              <Text style={{color: PRIORITY_COLORS[task.priority] ?? colors.gray500, fontSize: fontSize.xs, fontWeight: '700'}}>
                {t(`tasks.priority.${task.priority}`)}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>{t('tasks.assignedTo')}</Text>
            <Text style={[styles.fieldValue, {color: theme.text}]}>{task.assigned_to}</Text>
          </View>

          {task.deadline ? (
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>{t('tasks.deadline')}</Text>
              <Text style={[styles.fieldValue, {color: theme.text}]}>{task.deadline}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>{t('tasks.hoursLogged')}</Text>
            <Text style={[styles.fieldValue, {color: colors.primary}]}>{task.total_hours_logged}h</Text>
          </View>
        </Card>

        {/* Time Tracker card */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.timeTracker')}</Text>
        <Card style={styles.trackerCard}>
          <View style={styles.trackerRow}>
            <View style={styles.trackerItem}>
              <Text style={[styles.trackerValue, {color: colors.primary}]}>{todayHours}h</Text>
              <Text style={[styles.trackerLabel, {color: theme.textSecondary}]}>{t('tasks.todayTime')}</Text>
            </View>
            <View style={[styles.trackerDivider, {backgroundColor: theme.border}]} />
            <View style={styles.trackerItem}>
              <Text style={[styles.trackerValue, {color: theme.text}]}>{task.total_hours_logged}h</Text>
              <Text style={[styles.trackerLabel, {color: theme.textSecondary}]}>{t('tasks.hoursLogged')}</Text>
            </View>
          </View>
          <View style={styles.trackerBtns}>
            <Button
              label={isTimerRunningForThis ? t('tasks.stopTimer') : (timerState.paused && timerState.taskId === id ? t('timer.resume') : t('tasks.startTimer'))}
              onPress={handleStartTimer}
              variant={isTimerRunningForThis ? 'secondary' : 'primary'}
              style={{flex: 1}}
            />
          </View>
        </Card>

        {task.description ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.description')}</Text>
            <Card style={styles.descCard}>
              <Text style={[styles.descText, {color: theme.text}]}>{task.description}</Text>
            </Card>
          </>
        ) : null}

        {/* Stage selector */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.stage.label')}</Text>
        <TouchableOpacity
          style={[styles.stageSelector, {backgroundColor: theme.surface, borderColor: theme.border}]}
          onPress={() => setStageDropdownOpen(true)}>
          <Text style={[styles.stageSelectorText, {color: theme.text}]}>
            {t(`tasks.stage.${task.stage}`)}
          </Text>
          <Text style={{color: theme.textSecondary}}>▾</Text>
        </TouchableOpacity>

        <Modal
          visible={stageDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setStageDropdownOpen(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setStageDropdownOpen(false)}>
            <View style={[styles.dropdown, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {STAGES.map(stage => (
                <TouchableOpacity
                  key={stage}
                  style={[
                    styles.dropdownItem,
                    {borderBottomColor: theme.border},
                    task.stage === stage && {backgroundColor: colors.primary + '22'},
                  ]}
                  onPress={() => {
                    stageMutation.mutate(stage);
                    setStageDropdownOpen(false);
                  }}>
                  <Text style={{
                    color: task.stage === stage ? colors.primary : theme.text,
                    fontSize: fontSize.md,
                    fontWeight: task.stage === stage ? '700' : '400',
                  }}>
                    {t(`tasks.stage.${stage}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Attachments */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.attachments')}</Text>
        <Card style={styles.attachCard}>
          {task.attachments.length > 0
            ? task.attachments.map((att, idx) => (
                <View key={idx} style={[styles.attRow, {borderBottomColor: theme.border}]}>
                  <Text style={{fontSize: 18}}>📎</Text>
                  <Text style={[styles.attName, {color: theme.text}]}>{att}</Text>
                </View>
              ))
            : null}
          <Button
            label={'+ ' + t('tasks.addAttachment')}
            variant="secondary"
            onPress={() => navigation.navigate('AddAttachment', {taskId: id, taskName: task.name})}
          />
        </Card>

        {/* Time log history */}
        {taskEntries.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.timeLog')}</Text>
            <Card style={styles.timeLogCard}>
              {taskEntries.map(entry => (
                <View key={entry.id} style={[styles.entryRow, {borderBottomColor: theme.border}]}>
                  <View style={styles.entryLeft}>
                    <Text style={[styles.entryDate, {color: theme.textSecondary}]}>{entry.date}</Text>
                    {entry.description ? (
                      <Text style={[styles.entryDesc, {color: theme.textSecondary}]} numberOfLines={1}>
                        {entry.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.hoursBadge, {backgroundColor: colors.primary + '22'}]}>
                    <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: '700'}}>
                      {entry.hours}h
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Log Time button */}
        <Button
          label={t('tasks.logTime')}
          variant="secondary"
          onPress={() => navigation.navigate('LogTime', {taskId: id, taskName: task.name})}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md},
  card: {gap: spacing.sm},
  taskName: {fontSize: fontSize.xl, fontWeight: '700'},
  project: {fontSize: fontSize.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  fieldLabel: {fontSize: fontSize.sm},
  fieldValue: {fontSize: fontSize.sm, fontWeight: '600'},
  priorityBadge: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm},
  description: {fontSize: fontSize.sm, lineHeight: 20},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '600'},
  stageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  stageSelectorText: {fontSize: fontSize.md},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: 260,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  descCard: {gap: spacing.xs},
  descText: {fontSize: fontSize.sm, lineHeight: 22},
  attachCard: {gap: spacing.sm},
  attRow: {flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.xs},
  attName: {fontSize: fontSize.sm, flex: 1},
  timeLogCard: {gap: spacing.xs},
  entryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth},
  entryLeft: {flex: 1, gap: 2},
  entryDate: {fontSize: fontSize.xs},
  entryDesc: {fontSize: fontSize.xs},
  hoursBadge: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm},
  trackerCard: {gap: spacing.sm},
  trackerRow: {flexDirection: 'row', justifyContent: 'space-around'},
  trackerItem: {flex: 1, alignItems: 'center'},
  trackerValue: {fontSize: fontSize.xxl, fontWeight: '700'},
  trackerLabel: {fontSize: fontSize.xs, textAlign: 'center', marginTop: 2},
  trackerDivider: {width: 1},
  trackerBtns: {flexDirection: 'row'},
});
