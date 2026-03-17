import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {startTimer, stopTimer, pauseTimer, resumeTimer, tickTimer} from '../../store/slices/timerSlice';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {Task} from '../../api/mocks/tasks.mock';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHoursLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {return `${h}h ${m}m`;}
  return `${m}m`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function TimerScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const timerState = useAppSelector(state => state.timer);

  // Pickers for starting a new timer
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Keep ticking
  useEffect(() => {
    if (!timerState.running) {return;}
    const interval = setInterval(() => dispatch(tickTimer()), 1000);
    return () => clearInterval(interval);
  }, [timerState.running, dispatch]);

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const {data: timesheets} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  const projects = [...new Set((tasks ?? []).map(tk => tk.project))];
  const tasksForProject = (tasks ?? []).filter(tk => tk.project === selectedProject);

  const recentEntries = (timesheets ?? [])
    .flatMap(day => day.entries.map(e => ({...e, day: day.date})))
    .filter(e => timerState.taskId ? e.task_id === timerState.taskId : true)
    .slice(0, 3);

  const todayStr = new Date().toISOString().split('T')[0];
  const previousSessionsSeconds = (timesheets ?? [])
    .filter(day => day.date === todayStr)
    .flatMap(day => day.entries)
    .filter(e => timerState.taskId ? e.task_id === timerState.taskId : true)
    .reduce((sum, e) => sum + e.hours * 3600, 0);

  function handleStart() {
    if (!selectedTask) {return;}
    dispatch(startTimer({taskId: selectedTask.id, taskName: selectedTask.name}));
    setSelectedProject('');
    setSelectedTask(null);
  }

  function handleStop() {
    dispatch(stopTimer());
    navigation.goBack();
  }

  const isActive = timerState.running;
  const isPaused = timerState.paused;
  const hasTimer = isActive || isPaused;

  const startedAtLabel = timerState.startTimestamp
    ? new Date(timerState.startTimestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    : getCurrentTimeString();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('timer.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {hasTimer ? (
          <>
            {/* Main timer card */}
            <View style={[styles.timerCard, {backgroundColor: colors.primary}]}>
              {timerState.taskName ? (
                <Text style={styles.taskName} numberOfLines={2}>{timerState.taskName}</Text>
              ) : null}

              {/* Status dot */}
              <View style={[styles.statusDot, {backgroundColor: isActive ? '#4ade80' : '#fbbf24'}]} />

              <Text style={styles.timerDisplay}>{formatTime(timerState.elapsedSeconds)}</Text>

              <Text style={styles.statusText}>
                {isActive ? t('timer.running') : t('timer.paused')}
              </Text>

              {isActive ? (
                <Text style={styles.startedAt}>{t('timer.startedAt')}: {startedAtLabel}</Text>
              ) : null}

              {/* Controls */}
              <View style={styles.controls}>
                {isActive ? (
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => dispatch(pauseTimer())}>
                    <Text style={styles.controlBtnText}>{'⏸  '}{t('timer.pause')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => dispatch(resumeTimer())}>
                    <Text style={styles.controlBtnText}>{'▶  '}{t('timer.resume')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                  <Text style={styles.stopBtnText}>{'■  '}{t('tasks.stopTimer')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Today summary */}
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.cardTitle, {color: theme.text}]}>{t('timer.todayWork')}</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('timer.currentSession')}</Text>
                <Text style={[styles.infoValue, {color: colors.primary}]}>
                  {formatHoursLabel(timerState.elapsedSeconds)}
                </Text>
              </View>
              {previousSessionsSeconds > 0 ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{t('timer.previousSessions')}</Text>
                  <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                    {formatHoursLabel(previousSessionsSeconds)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.divider, {backgroundColor: theme.border}]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.text}]}>{t('timer.totalToday')}</Text>
                <Text style={[styles.infoValueLarge, {color: theme.text}]}>
                  {formatHoursLabel(timerState.elapsedSeconds + previousSessionsSeconds)}
                </Text>
              </View>
            </View>

            {/* Recent sessions */}
            {recentEntries.length > 0 ? (
              <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <Text style={[styles.cardTitle, {color: theme.text}]}>{t('timer.recentSessions')}</Text>
                {recentEntries.map(entry => (
                  <View key={entry.id} style={[styles.sessionRow, {borderBottomColor: theme.border}]}>
                    <View style={styles.sessionLeft}>
                      <Text style={[styles.sessionTask, {color: theme.text}]} numberOfLines={1}>{entry.task_name}</Text>
                      <Text style={[styles.sessionProject, {color: theme.textSecondary}]}>{entry.project}</Text>
                      {entry.time_start && entry.time_end ? (
                        <Text style={[styles.sessionTime, {color: theme.textSecondary}]}>
                          {entry.time_start} – {entry.time_end}
                        </Text>
                      ) : (
                        <Text style={[styles.sessionTime, {color: theme.textSecondary}]}>{entry.day}</Text>
                      )}
                    </View>
                    <View style={[styles.hoursBadge, {backgroundColor: colors.primary + '20'}]}>
                      <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: '700'}}>
                        {entry.hours}h
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Tip */}
            <View style={[styles.tipCard, {backgroundColor: '#fef3c7', borderColor: '#f59e0b'}]}>
              <Text style={styles.tipText}>{'💡 '}{t('timer.tip')}</Text>
            </View>
          </>
        ) : (
          <>
            {/* Empty state with start-timer form */}
            <View style={styles.emptyHeader}>
              <Text style={styles.emptyIcon}>⏱️</Text>
              <Text style={[styles.emptyTitle, {color: theme.text}]}>{t('timer.noTimer')}</Text>
              <Text style={[styles.emptySubtitle, {color: theme.textSecondary}]}>
                {t('timer.startFromTask')}
              </Text>
            </View>

            {/* Project picker */}
            <View style={[styles.pickerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.pickerLabel, {color: theme.textSecondary}]}>{t('tasks.project')}</Text>
              <TouchableOpacity
                style={[styles.pickerRow, {borderColor: theme.border}]}
                onPress={() => {setShowProjectPicker(p => !p); setShowTaskPicker(false);}}>
                <Text style={[styles.pickerValue, {color: selectedProject ? theme.text : theme.textSecondary}]}>
                  {selectedProject || '— ' + t('tasks.project') + ' —'}
                </Text>
                <Text style={[styles.pickerArrow, {color: theme.textSecondary}]}>
                  {showProjectPicker ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              {showProjectPicker && (
                <View style={[styles.dropdownList, {borderColor: theme.border, backgroundColor: theme.surface}]}>
                  {projects.map(proj => (
                    <TouchableOpacity
                      key={proj}
                      style={[styles.dropdownItem, {borderBottomColor: theme.border}, selectedProject === proj && {backgroundColor: colors.primary + '12'}]}
                      onPress={() => {
                        setSelectedProject(proj);
                        setSelectedTask(null);
                        setShowProjectPicker(false);
                      }}>
                      <Text style={[styles.dropdownItemText, {color: selectedProject === proj ? colors.primary : theme.text}]}>
                        {proj}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Task picker */}
            <View style={[styles.pickerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.pickerLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
              <TouchableOpacity
                style={[styles.pickerRow, {borderColor: theme.border}, !selectedProject && styles.pickerDisabled]}
                disabled={!selectedProject}
                onPress={() => {setShowTaskPicker(p => !p); setShowProjectPicker(false);}}>
                <Text style={[styles.pickerValue, {color: selectedTask ? theme.text : theme.textSecondary}]}>
                  {selectedTask ? selectedTask.name : '— ' + t('tasks.task') + ' —'}
                </Text>
                <Text style={[styles.pickerArrow, {color: theme.textSecondary}]}>
                  {showTaskPicker ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              {showTaskPicker && (
                <View style={[styles.dropdownList, {borderColor: theme.border, backgroundColor: theme.surface}]}>
                  {tasksForProject.map(tk => (
                    <TouchableOpacity
                      key={tk.id}
                      style={[styles.dropdownItem, {borderBottomColor: theme.border}, selectedTask?.id === tk.id && {backgroundColor: colors.primary + '12'}]}
                      onPress={() => {
                        setSelectedTask(tk);
                        setShowTaskPicker(false);
                      }}>
                      <Text style={[styles.dropdownItemText, {color: selectedTask?.id === tk.id ? colors.primary : theme.text}]}>
                        {tk.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Button
              label={'▶  ' + t('tasks.startTimer')}
              onPress={handleStart}
              disabled={!selectedTask}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md, alignItems: 'stretch'},

  // Timer running view
  timerCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskName: {color: 'rgba(255,255,255,0.85)', fontSize: fontSize.md, textAlign: 'center'},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  timerDisplay: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  statusText: {color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm},
  startedAt: {color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs},
  controls: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  pauseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stopBtn: {
    backgroundColor: 'rgba(220,38,38,0.8)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  controlBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  stopBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  card: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  cardTitle: {fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  infoLabel: {fontSize: fontSize.sm},
  infoValue: {fontSize: fontSize.md, fontWeight: '700'},
  infoValueLarge: {fontSize: fontSize.xl, fontWeight: '700'},
  divider: {height: StyleSheet.hairlineWidth},
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionLeft: {flex: 1, gap: 2},
  sessionTask: {fontSize: fontSize.sm, fontWeight: '600'},
  sessionProject: {fontSize: fontSize.xs},
  sessionTime: {fontSize: fontSize.xs},
  hoursBadge: {paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm},
  tipCard: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md},
  tipText: {fontSize: fontSize.xs, lineHeight: 18, color: '#92400e'},

  // Empty state / start timer
  emptyHeader: {alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.xs},
  emptyIcon: {fontSize: 56},
  emptyTitle: {fontSize: fontSize.xl, fontWeight: '700'},
  emptySubtitle: {fontSize: fontSize.sm, textAlign: 'center', color: '#666'},

  // Pickers
  pickerCard: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  pickerLabel: {fontSize: fontSize.xs, fontWeight: '600'},
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pickerDisabled: {opacity: 0.45},
  pickerValue: {fontSize: fontSize.sm, flex: 1},
  pickerArrow: {fontSize: fontSize.sm},
  dropdownList: {borderWidth: 1, borderRadius: radius.sm, marginTop: spacing.xs, overflow: 'hidden'},
  dropdownItem: {padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth},
  dropdownItemText: {fontSize: fontSize.sm},
});
