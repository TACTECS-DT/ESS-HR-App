import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AttendanceStackParamList} from '../../navigation/types';
import type {AttendanceSummary} from '../../api/types/attendance';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<AttendanceStackParamList>;

// TODO: fetch real tasks from /ess/api/tasks once the Tasks feature is enabled in Odoo
// (tasks.py: set _FEATURES_ENABLED = True, then replace this with a useQuery call)
// const TASK_OPTIONS = [
//   {id: 1, name: 'PRJ-001: Mobile App Development'},
//   {id: 2, name: 'PRJ-002: API Integration'},
//   {id: 3, name: 'PRJ-003: UI Testing'},
// ];

const MOODS = ['😄', '🙂', '😐', '😔', '😟'];

export default function AttendanceDashboardScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const {canViewTeamAttendance, canManualEditAttendance} = useRBAC();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language === 'ar';

  const {showError} = useApiError();

  // const [selectedTask, setSelectedTask] = useState<number | null>(null); // TODO: re-enable with real tasks
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationCoords, setLocationCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'checkin' | 'checkout' | 'info' | 'error' | 'location';
    title: string;
    message?: string;
  }>({visible: false, type: 'checkin', title: ''});
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  async function getLocation(): Promise<{latitude: number; longitude: number}> {
    setLocLoading(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('attendance.locationPermissionTitle', 'Location Access'),
            message: t('attendance.locationPermissionMsg', 'ESS HR needs your location to record attendance.'),
            buttonPositive: t('common.allow', 'Allow'),
            buttonNegative: t('common.deny', 'Deny'),
            buttonNeutral: t('common.later', 'Later'),
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('location_permission_denied');
        }
      }
      return await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => {
            const {latitude, longitude} = pos.coords;
            if (latitude === 0 && longitude === 0) {
              reject(new Error('location_no_fix'));
              return;
            }
            setLocationCoords({lat: latitude, lng: longitude});
            resolve({latitude, longitude});
          },
          err => {
            if (err.code === 1) {reject(new Error('location_permission_denied'));}
            else if (err.code === 2) {reject(new Error('location_services_disabled'));}
            else {reject(new Error('location_no_fix'));}
          },
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 0},
        );
      });
    } finally {
      setLocLoading(false);
    }
  }

  function showFeedbackModal(
    type: 'checkin' | 'checkout' | 'info' | 'error' | 'location',
    title: string,
    message?: string,
  ) {
    setFeedbackModal({visible: true, type, title, message});
  }

  function hideFeedbackModal() {
    setFeedbackModal(m => ({...m, visible: false}));
  }

  const {data: summary, isLoading, refetch} = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.attendance.summary);
      return isApiSuccess(res.data) ? (res.data.data as AttendanceSummary) : null;
    },
  });

  const isCheckedIn = summary?.status === 'checked_in';

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const {latitude, longitude} = await getLocation();
      const res = await apiClient.post(API_MAP.attendance.checkIn, {
        // task_id: selectedTask, // TODO: re-enable when tasks are fetched from Odoo
        latitude,
        longitude,
      });
      return res.data;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({queryKey: ['attendance-summary']});
      if (res?.data?.already_checked_in) {
        showFeedbackModal(
          'info',
          t('attendance.alreadyCheckedInTitle', 'Already Checked In'),
          t('attendance.alreadyCheckedInMsg', 'You are already checked in.'),
        );
      } else {
        showFeedbackModal('checkin', t('attendance.checkInSuccess', 'Checked In!'));
      }
    },
    onError: (err: any) => {
      if (err?.message === 'location_permission_denied') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationPermissionDenied', 'Please allow location access to check in.'),
        );
      } else if (err?.message === 'location_services_disabled') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationServicesDisabled', 'Your device location is turned off. Please enable it in Settings and try again.'),
        );
      } else if (err?.message === 'location_no_fix') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationNoFix', 'Could not get your location. Please enable GPS and try again.'),
        );
      } else {
        showError(err);
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const {latitude, longitude} = await getLocation();
      const res = await apiClient.post(API_MAP.attendance.checkOut, {
        latitude,
        longitude,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['attendance-summary']});
      showFeedbackModal('checkout', t('attendance.checkOutSuccess', 'Checked Out!'));
    },
    onError: (err: any) => {
      if (err?.message === 'location_permission_denied') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationPermissionDenied', 'Please allow location access to check out.'),
        );
      } else if (err?.message === 'location_services_disabled') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationServicesDisabled', 'Your device location is turned off. Please enable it in Settings and try again.'),
        );
      } else if (err?.message === 'location_no_fix') {
        showFeedbackModal(
          'location',
          t('attendance.locationRequired', 'Location Required'),
          t('attendance.locationNoFix', 'Could not get your location. Please enable GPS and try again.'),
        );
      } else {
        showError(err);
      }
    },
  });

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  useEffect(() => {
    if (isPending) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.18, duration: 1300, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 1300, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isPending, pulseAnim]);

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

  // const selectedTaskName = TASK_OPTIONS.find(tk => tk.id === selectedTask)?.name ?? null; // TODO: re-enable with real tasks

  // TODO: re-enable task picker when /ess/api/tasks is active
  // function handleTaskSelect() { ... }

  const todayStr = new Date().toISOString().split('T')[0];

  function handleMainPress() {
    if (isPending) {return;}
    if (isCheckedIn) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate();
    }
  }

  const heroColor = isCheckedIn ? colors.success : colors.primary;
  const checkInTimeFmt = summary?.check_in_time
    ? summary.check_in_time.split(' ')[1]?.slice(0, 5) ?? summary.check_in_time
    : null;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#fff" />}
        contentContainerStyle={styles.content}>

        {/* ── HERO PANEL ── */}
        <View style={[styles.hero, {backgroundColor: heroColor, paddingTop: insets.top + spacing.sm}]}>

          {/* Top bar */}
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>{t('attendance.title')}</Text>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.navigate('AttendanceHistory')}>
              <Text style={styles.heroIcon}>📋</Text>
            </TouchableOpacity>
          </View>

          {/* Status pill */}
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>
              {isCheckedIn
                ? `${t('attendance.checkIn').toUpperCase()}${checkInTimeFmt ? `  ·  ${checkInTimeFmt}` : ''}`
                : t('attendance.readyToCheckIn', 'READY TO CHECK IN')}
            </Text>
          </View>

          {/* Rings + button */}
          <View style={styles.ringContainer}>
            <Animated.View style={[styles.ringOuter, {transform: [{scale: pulseAnim}]}]} />
            <View style={styles.ringMid} />
            <TouchableOpacity
              style={[styles.mainBtn, isPending && styles.dimmed]}
              onPress={handleMainPress}
              disabled={isPending}
              activeOpacity={0.8}>
              {isPending ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.mainBtnIcon}>{isCheckedIn ? '🔴' : '🟢'}</Text>
                  <Text style={styles.mainBtnLabel}>
                    {isCheckedIn
                      ? t('attendance.checkOut').toUpperCase()
                      : t('attendance.checkIn').toUpperCase()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Clock */}
          <Text style={styles.clockText}>{timeStr}</Text>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <View style={styles.heroSpacer} />
        </View>

        {/* ── Location Card ── */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.locationHeader}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>📍 {t('attendance.location')}</Text>
            {locLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          {locationCoords ? (
            <>
              <View style={styles.coordRow}>
                <Text style={[styles.coordLabel, {color: theme.textSecondary}]}>
                  {t('attendance.latitude', 'Lat')}
                </Text>
                <Text style={[styles.coordValue, {color: theme.text}]}>
                  {locationCoords.lat.toFixed(6)}
                </Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={[styles.coordLabel, {color: theme.textSecondary}]}>
                  {t('attendance.longitude', 'Lng')}
                </Text>
                <Text style={[styles.coordValue, {color: theme.text}]}>
                  {locationCoords.lng.toFixed(6)}
                </Text>
              </View>
              <Text style={[styles.locationStatus, {color: colors.success}]}>
                {'✓ '}{t('attendance.locationCaptured', 'Location captured')}
              </Text>
            </>
          ) : (
            <Text style={[styles.locationHint, {color: theme.textSecondary}]}>
              {locLoading
                ? t('attendance.fetchingLocation', 'Fetching your location…')
                : t('attendance.locationOnCheckIn', 'Location will be captured on check-in / check-out')}
            </Text>
          )}
        </View>

        {/* ── Task Assignment (hidden until Tasks feature is enabled in Odoo) ──
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardLabel, {color: theme.textSecondary}]}>
            {t('attendance.task')}{` ${t('common.optional')}`}
          </Text>
          <TouchableOpacity
            style={[styles.taskSelector, {borderColor: theme.border, backgroundColor: theme.background}]}
            onPress={handleTaskSelect}>
            <Text
              style={[styles.taskSelectorText, {color: selectedTaskName ? theme.text : theme.textSecondary}]}
              numberOfLines={1}>
              {selectedTaskName ?? `-- ${t('attendance.selectTask')} --`}
            </Text>
            <Text style={[styles.chevron, {color: theme.textSecondary}]}>▾</Text>
          </TouchableOpacity>
        </View>
        */}

        {/* ── Mood ── */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>
            {'😊 '}{t('attendance.moodQuestion')}
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
          {canViewTeamAttendance ? (
            <TouchableOpacity
              style={[styles.navCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
              onPress={() => navigation.navigate('AttendanceTeam')}>
              <Text style={styles.navIcon}>👥</Text>
              <Text style={[styles.navLabel, {color: theme.text}]} numberOfLines={2}>
                {t('attendance.teamAttendance', 'Team')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canManualEditAttendance ? (
            <TouchableOpacity
              style={[styles.navCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
              onPress={() => navigation.navigate('AttendanceManualEntry')}>
              <Text style={styles.navIcon}>✏️</Text>
              <Text style={[styles.navLabel, {color: theme.text}]} numberOfLines={2}>
                {t('attendance.manualEntry', 'Manual Entry')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Feedback Modal ── */}
      <Modal
        transparent
        visible={feedbackModal.visible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hideFeedbackModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconCircle,
                {
                  backgroundColor:
                    feedbackModal.type === 'checkin'
                      ? colors.success
                      : feedbackModal.type === 'checkout'
                      ? colors.primary
                      : feedbackModal.type === 'info'
                      ? colors.warning
                      : feedbackModal.type === 'location'
                      ? colors.warning
                      : colors.error,
                },
              ]}>
              <Text style={styles.modalIconText}>
                {feedbackModal.type === 'checkin' || feedbackModal.type === 'checkout'
                  ? '✓'
                  : feedbackModal.type === 'info'
                  ? 'i'
                  : feedbackModal.type === 'location'
                  ? '📍'
                  : '✕'}
              </Text>
            </View>
            <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
            {feedbackModal.message ? (
              <Text style={styles.modalMessage}>{feedbackModal.message}</Text>
            ) : null}
            {(feedbackModal.type === 'checkin' || feedbackModal.type === 'checkout') ? (
              <Text style={styles.modalTimeText}>{timeStr}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.modalDismissBtn,
                {
                  backgroundColor:
                    feedbackModal.type === 'checkin'
                      ? colors.success
                      : feedbackModal.type === 'checkout'
                      ? colors.primary
                      : feedbackModal.type === 'info'
                      ? colors.warning
                      : feedbackModal.type === 'location'
                      ? colors.warning
                      : colors.error,
                },
              ]}
              onPress={hideFeedbackModal}
              activeOpacity={0.8}>
              <Text style={styles.modalDismissBtnText}>
                {t('attendance.dismiss', 'Got it')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const BTN = 128;
const RING_MID = 164;
const RING_OUTER = 204;

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: spacing.md, paddingBottom: spacing.xxl},

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  heroTitle: {fontSize: fontSize.xl, fontWeight: '700', color: '#fff'},
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: {fontSize: 18},

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    marginBottom: spacing.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.6,
  },

  ringContainer: {
    width: RING_OUTER + 10,
    height: RING_OUTER + 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  ringMid: {
    position: 'absolute',
    width: RING_MID,
    height: RING_MID,
    borderRadius: RING_MID / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  mainBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  mainBtnIcon: {fontSize: 36},
  mainBtnLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.2,
  },
  dimmed: {opacity: 0.55},

  clockText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroDate: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 3,
  },
  heroSpacer: {height: spacing.xl},

  // Cards
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {fontSize: fontSize.md, fontWeight: '600'},
  cardLabel: {fontSize: fontSize.sm},

  locationHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  coordRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  coordLabel: {fontSize: fontSize.sm},
  coordValue: {fontSize: fontSize.sm, fontWeight: '600', fontVariant: ['tabular-nums']},
  locationStatus: {fontSize: fontSize.sm, fontWeight: '600'},
  locationHint: {fontSize: fontSize.sm},

  // Task selector (hidden — re-enable with real tasks from Odoo)
  // taskSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs },
  // taskSelectorText: { flex: 1, fontSize: fontSize.sm },
  // chevron: { fontSize: 14 },

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
  navRow: {flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md},
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

  // ── Feedback Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalIconText: {
    fontSize: 38,
    color: '#fff',
    fontWeight: '800',
    lineHeight: 46,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fontSize.sm,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalTimeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  modalDismissBtn: {
    borderRadius: radius.round,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xs,
    minWidth: 140,
    alignItems: 'center',
  },
  modalDismissBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
