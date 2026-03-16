import React, {useEffect} from 'react';
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
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {stopTimer, pauseTimer, resumeTimer, tickTimer} from '../../store/slices/timerSlice';
import {spacing, fontSize, colors, radius} from '../../config/theme';
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

  // Keep ticking
  useEffect(() => {
    if (!timerState.running) {return;}
    const interval = setInterval(() => dispatch(tickTimer()), 1000);
    return () => clearInterval(interval);
  }, [timerState.running, dispatch]);

  const {data: timesheets} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  // Collect recent entries for the active task
  const recentEntries = (timesheets ?? [])
    .flatMap(day => day.entries.map(e => ({...e, day: day.date})))
    .filter(e => timerState.taskId ? e.task_id === timerState.taskId : true)
    .slice(0, 3);

  function handleStop() {
    dispatch(stopTimer());
    navigation.goBack();
  }

  function handlePause() {
    dispatch(pauseTimer());
  }

  function handleResume() {
    dispatch(resumeTimer());
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
              <Text style={styles.taskName} numberOfLines={2}>{timerState.taskName ?? ''}</Text>

              <Text style={styles.timerDisplay}>{formatTime(timerState.elapsedSeconds)}</Text>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, {backgroundColor: isActive ? '#4ade80' : '#fbbf24'}]} />
                <Text style={styles.statusText}>
                  {isActive ? t('timer.running') : t('timer.paused')}
                </Text>
              </View>

              {isActive ? (
                <Text style={styles.startedAt}>{t('timer.startedAt')}: {startedAtLabel}</Text>
              ) : null}

              {/* Controls row */}
              <View style={styles.controls}>
                {isActive ? (
                  <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
                    <Text style={styles.controlBtnText}>{'⏸  '}{t('timer.pause')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.pauseBtn} onPress={handleResume}>
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
              <View style={[styles.divider, {backgroundColor: theme.border}]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: theme.text}]}>{t('timer.totalToday')}</Text>
                <Text style={[styles.infoValueLarge, {color: theme.text}]}>
                  {formatHoursLabel(timerState.elapsedSeconds)}
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
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={[styles.emptyTitle, {color: theme.text}]}>{t('timer.noTimer')}</Text>
            <Text style={[styles.emptySubtitle, {color: theme.textSecondary}]}>
              {t('timer.startFromTask')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md, alignItems: 'stretch'},
  timerCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  taskName: {color: 'rgba(255,255,255,0.85)', fontSize: fontSize.md, textAlign: 'center'},
  timerDisplay: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  statusDot: {width: 8, height: 8, borderRadius: 4},
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
  emptyState: {paddingTop: 80, alignItems: 'center', gap: spacing.md},
  emptyIcon: {fontSize: 64},
  emptyTitle: {fontSize: fontSize.xl, fontWeight: '700'},
  emptySubtitle: {fontSize: fontSize.sm, textAlign: 'center'},
});
