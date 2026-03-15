import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AttendanceStackParamList} from '../../navigation/types';
import type {AttendanceSummary} from '../../api/mocks/attendance.mock';

type Nav = StackNavigationProp<AttendanceStackParamList>;

const MOCK_TASKS = [
  {id: 1, name: 'PRJ-001: Mobile App Development'},
  {id: 2, name: 'PRJ-002: API Integration'},
  {id: 3, name: 'PRJ-003: UI Testing'},
];

const MOODS = ['😄', '🙂', '😐', '😔', '😟'];

export default function AttendanceDashboardScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language === 'ar';

  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const {data: summary, isLoading, refetch} = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/summary');
      return isApiSuccess(res.data) ? (res.data.data as AttendanceSummary) : null;
    },
  });

  const isCheckedIn = summary?.status === 'checked_in';

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/attendance/check-in', {
        task_id: selectedTask,
        location: {lat: 24.7136, lng: 46.6753},
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['attendance-summary']});
      Alert.alert(t('common.done'), t('attendance.checkIn') + ' ✓');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/attendance/check-out', {
        location: {lat: 24.7136, lng: 46.6753},
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['attendance-summary']});
      Alert.alert(t('common.done'), t('attendance.checkOut') + ' ✓');
    },
  });

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = currentTime.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const selectedTaskName = MOCK_TASKS.find(tk => tk.id === selectedTask)?.name ?? null;

  const todayStr = new Date().toISOString().split('T')[0];

  function handleMainPress() {
    if (isPending) {return;}
    if (isCheckedIn) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate();
    }
  }

  function handleTaskSelect() {
    const clearOpt = selectedTask
      ? [{text: isAr ? '✕ مسح الاختيار' : '✕ Clear selection', onPress: () => setSelectedTask(null)}]
      : [];
    Alert.alert(
      t('attendance.task'),
      '',
      [
        ...MOCK_TASKS.map(tk => ({
          text: tk.name,
          onPress: () => setSelectedTask(tk.id),
        })),
        ...clearOpt,
        {text: t('common.cancel'), style: 'cancel' as const},
      ],
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Blue header */}
      <View
        style={[
          styles.header,
          {backgroundColor: colors.primary, paddingTop: insets.top + spacing.sm},
        ]}>
        <Text style={styles.headerTitle}>{t('attendance.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')}>
          <Text style={styles.headerIcon}>📋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.content}>

        {/* ── Big circular check-in/out button ── */}
        <View style={styles.centerSection}>
          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor: isCheckedIn ? '#fdecea' : '#e6f4ea',
                borderColor: isCheckedIn ? colors.error : colors.success,
              },
              isPending && styles.dimmed,
            ]}
            onPress={handleMainPress}
            disabled={isPending}
            activeOpacity={0.8}>
            <Text style={styles.mainBtnIcon}>{isCheckedIn ? '✋' : '👆'}</Text>
            <Text style={[styles.mainBtnText, {color: isCheckedIn ? colors.error : colors.success}]}>
              {isPending
                ? t('common.loading')
                : isCheckedIn
                ? t('attendance.checkOut').toUpperCase()
                : t('attendance.checkIn').toUpperCase()}
            </Text>
          </TouchableOpacity>

          {/* Live clock */}
          <Text style={[styles.timeText, {color: theme.text}]}>{timeStr}</Text>
          <Text style={[styles.dateText, {color: theme.textSecondary}]}>{dateStr}</Text>

          {/* Checked-in time badge */}
          {summary?.check_in_time ? (
            <View style={[styles.checkinBadge, {backgroundColor: colors.success + '20'}]}>
              <Text style={[styles.checkinBadgeText, {color: colors.success}]}>
                ✓ {t('attendance.checkIn')}: {summary.check_in_time}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Location Card ── */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>📍 {t('attendance.location')}</Text>
          <View style={[styles.mapPlaceholder, {backgroundColor: theme.border}]}>
            <Text style={[styles.mapLabel, {color: theme.textSecondary}]}>
              🗺 {isAr ? '[معاينة الموقع - الموقع الحالي]' : '[Map Preview - Current Location]'}
            </Text>
          </View>
          <Text style={[styles.locationStatus, {color: colors.success}]}>
            {isAr
              ? '✓ داخل النطاق المسموح (مكتب - 50م)'
              : '✓ Within allowed zone (Office - 50m)'}
          </Text>
        </View>

        {/* ── Task Assignment ── */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardLabel, {color: theme.textSecondary}]}>
            {t('attendance.task')}{isAr ? ' (اختياري)' : ' (Optional)'}
          </Text>
          <TouchableOpacity
            style={[styles.taskSelector, {borderColor: theme.border, backgroundColor: theme.background}]}
            onPress={handleTaskSelect}>
            <Text
              style={[
                styles.taskSelectorText,
                {color: selectedTaskName ? theme.text : theme.textSecondary},
              ]}
              numberOfLines={1}>
              {selectedTaskName ?? (isAr ? '-- اختر مهمة --' : '-- Select Task --')}
            </Text>
            <Text style={[styles.chevron, {color: theme.textSecondary}]}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* ── Mood ── */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>
            {isAr ? '😊 كيف حالك اليوم؟' : '😊 How are you feeling today?'}
          </Text>
          <View style={styles.moodRow}>
            {MOODS.map((emoji, idx) => {
              const isSelected = selectedMood === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.moodBtn,
                    isSelected && {
                      backgroundColor: colors.primary + '22',
                      borderColor: colors.primary,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedMood(isSelected ? null : idx)}>
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Quick Nav ── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('AttendanceHistory')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={[styles.navLabel, {color: theme.text}]} numberOfLines={2}>
              {t('attendance.history')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('AttendanceDailySheet', {date: todayStr})}>
            <Text style={styles.navIcon}>📅</Text>
            <Text style={[styles.navLabel, {color: theme.text}]} numberOfLines={2}>
              {t('attendance.dailySheet')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => {
              const now = new Date();
              navigation.navigate('AttendanceMonthlySheet', {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
              });
            }}>
            <Text style={styles.navIcon}>🗓</Text>
            <Text style={[styles.navLabel, {color: theme.text}]} numberOfLines={2}>
              {t('attendance.monthlySheet')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {fontSize: fontSize.xl, fontWeight: '700', color: colors.white},
  headerIcon: {fontSize: 22},

  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl},

  // Center section
  centerSection: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm},
  mainBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mainBtnIcon: {fontSize: 40},
  mainBtnText: {fontSize: fontSize.md, fontWeight: '700'},
  dimmed: {opacity: 0.6},
  timeText: {fontSize: 32, fontWeight: '700', marginTop: spacing.sm},
  dateText: {fontSize: fontSize.sm},
  checkinBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: 4,
  },
  checkinBadgeText: {fontSize: fontSize.xs, fontWeight: '600'},

  // Cards
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {fontSize: fontSize.md, fontWeight: '600'},
  cardLabel: {fontSize: fontSize.sm},

  // Map placeholder
  mapPlaceholder: {
    height: 100,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLabel: {fontSize: fontSize.sm},
  locationStatus: {fontSize: fontSize.sm, fontWeight: '600'},

  // Task selector
  taskSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  taskSelectorText: {flex: 1, fontSize: fontSize.sm},
  chevron: {fontSize: 14},

  // Mood
  moodRow: {flexDirection: 'row', justifyContent: 'space-around'},
  moodBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  moodEmoji: {fontSize: 28},

  // Quick nav
  navRow: {flexDirection: 'row', gap: spacing.sm},
  navCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  navIcon: {fontSize: 24},
  navLabel: {fontSize: fontSize.xs, fontWeight: '600', textAlign: 'center'},
});
