import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {useRBAC} from '../../hooks/useRBAC';
import {toggleDarkMode, setLanguage} from '../../store/slices/settingsSlice';
import {toggleLanguage} from '../../i18n/';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LeaveBalance} from '../../api/mocks/leave.mock';
import type {AppNotification} from '../../api/mocks/notifications.mock';

// ─── leave type → color ───────────────────────────────────────
const LEAVE_COLORS = [colors.primary, colors.warning, colors.success, '#AF52DE', colors.info];

// ─── 3-column service grid items ────────────────────────────────
type ServiceItem = {
  icon: string;
  labelKey: string;
  tab?: string;
  screen?: string;
  screenTab?: string;
  homeScreen?: string; // navigate within HomeStack directly
  /** If set, item is hidden unless the role has this permission */
  requiresPermission?: 'canViewTeamWidgets' | 'canAccessPendingApprovals' | 'canAccessAnalytics' | 'canAccessTeamHours';
};

const ALL_SERVICES: ServiceItem[] = [
  {icon: '⏰', labelKey: 'attendance.title',           tab: 'AttendanceTab'},
  {icon: '🏖', labelKey: 'leave.title',                tab: 'LeavesTab'},
  {icon: '💰', labelKey: 'payslip.title',              tab: 'PayslipTab'},
  {icon: '🧾', labelKey: 'expense.title',              screenTab: 'MoreTab', screen: 'ExpenseList'},
  {icon: '🏦', labelKey: 'loan.title',                 screenTab: 'MoreTab', screen: 'LoanList'},
  {icon: '💵', labelKey: 'advanceSalary.title',        screenTab: 'MoreTab', screen: 'AdvanceSalaryList'},
  {icon: '📄', labelKey: 'hrLetters.title',            screenTab: 'MoreTab', screen: 'HRLetterList'},
  {icon: '📋', labelKey: 'documentRequests.title',     screenTab: 'MoreTab', screen: 'DocumentRequestList'},
  {icon: '🎓', labelKey: 'experienceCertificates.title', screenTab: 'MoreTab', screen: 'ExperienceCertList'},
  {icon: '🔧', labelKey: 'businessServices.title',     screenTab: 'MoreTab', screen: 'BusinessServiceList'},
  {icon: '✅', labelKey: 'tasks.title',                screenTab: 'MoreTab', screen: 'TaskList'},
  {icon: '🕐', labelKey: 'timesheets.title',           screenTab: 'MoreTab', screen: 'TimesheetWeekly'},
  // Manager/HR/Admin only
  {icon: '👥', labelKey: 'home.myTeam',               screenTab: 'LeavesTab', screen: 'LeaveTeamBalance', requiresPermission: 'canViewTeamWidgets'},
  {icon: '⏳', labelKey: 'home.pendingApprovals',      homeScreen: 'PendingApprovals',                   requiresPermission: 'canAccessPendingApprovals'},
  // Always visible
  {icon: '⚙️', labelKey: 'settings.title',             screenTab: 'MoreTab', screen: 'Settings'},
  {icon: '☰',  labelKey: 'home.more',                  screenTab: 'MoreTab', screen: 'MoreHub'},
];

export default function HomeScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(state => state.auth.user);
  const darkMode = useAppSelector(state => state.settings.darkMode);
  const currentLanguage = useAppSelector(state => state.settings.language);
  const rbac = useRBAC();

  // Filter services based on role permissions
  const SERVICES = ALL_SERVICES.filter(svc => {
    if (!svc.requiresPermission) {return true;}
    return rbac[svc.requiresPermission] === true;
  });
  const isAr = i18n.language === 'ar';

  const {data: balancesData, isLoading: balancesLoading, refetch: refetchBalances} = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return isApiSuccess(res.data) ? (res.data.data as LeaveBalance[]) : [];
    },
  });

  const {data: notificationsData, refetch: refetchNotifications} = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return isApiSuccess(res.data) ? (res.data.data as AppNotification[]) : [];
    },
  });

  const [refreshing, setRefreshing] = React.useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchBalances(), refetchNotifications()]);
    setRefreshing(false);
  }

  async function handleToggleLanguage() {
    const nextLang = currentLanguage === 'en' ? 'ar' : 'en';
    await toggleLanguage();
    dispatch(setLanguage(nextLang));
  }

  const displayName = isAr ? user?.name_ar : user?.name;
  const displayDept = isAr ? user?.department_ar : user?.department;
  const unreadCount = (notificationsData ?? []).filter(n => !n.is_read).length;
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  function handleServicePress(svc: ServiceItem) {
    if (!svc.tab && !svc.screenTab && !svc.homeScreen) {return;}
    // Same-stack navigation (HomeStack)
    if (svc.homeScreen) {
      navigation.navigate(svc.homeScreen as any);
      return;
    }
    const tabNav = navigation.getParent() ?? navigation;
    if (svc.screenTab && svc.screen) {
      tabNav.navigate(svc.screenTab, {screen: svc.screen});
    } else if (svc.tab && svc.screen) {
      tabNav.navigate(svc.tab, {screen: svc.screen});
    } else if (svc.tab) {
      tabNav.navigate(svc.tab);
    }
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* ── Blue header ── */}
      <View style={[styles.header, {backgroundColor: colors.primary, paddingTop: insets.top + spacing.sm}]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('home.title')}</Text>
          <View style={styles.headerActions}>
            {/* Language toggle */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleToggleLanguage}>
              <Text style={styles.headerIconText}>{currentLanguage === 'en' ? 'AR' : 'EN'}</Text>
            </TouchableOpacity>
            {/* Dark mode toggle */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => dispatch(toggleDarkMode())}>
              <Text style={styles.headerIconText}>{darkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            {/* Notifications bell */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.headerIconText}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile row inside header — tap to open Profile */}
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.75}
          onPress={() => {
            const tabNav = navigation.getParent() ?? navigation;
            tabNav.navigate('MoreTab', {screen: 'Profile'});
          }}>
          {user?.avatar ? (
            <Image source={{uri: user.avatar}} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{displayName?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <View style={{flex: 1}}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileSub}>
              {user?.badge_id} · {displayDept}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </Text>
          </View>
          <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 20}}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* ── Leave Balance Card ── */}
        <View style={[styles.leaveCard, {backgroundColor: theme.surface, shadowColor: theme.text}]}>
          {balancesLoading ? (
            <View style={styles.leaveRow}>
              {[0, 1, 2].map(i => (
                <View key={i} style={styles.leaveItem}>
                  <View style={[styles.leaveSkeleton, {backgroundColor: theme.border}]} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.leaveRow}>
              {(balancesData ?? []).slice(0, 3).map((b, idx) => {
                const barColor = LEAVE_COLORS[idx % LEAVE_COLORS.length];
                const pct = b.allocated > 0 ? b.remaining / b.allocated : 0;
                return (
                  <View key={b.leave_type_id} style={styles.leaveItem}>
                    <Text style={[styles.leaveNum, {color: barColor}]}>{b.remaining}</Text>
                    <Text style={[styles.leaveName, {color: theme.textSecondary}]} numberOfLines={1}>
                      {isAr ? b.leave_type_name_ar : b.leave_type_name}
                    </Text>
                    {/* Progress bar */}
                    <View style={[styles.barTrack, {backgroundColor: theme.border}]}>
                      <View style={[styles.barFill, {backgroundColor: barColor, width: `${Math.round(pct * 100)}%`}]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Services Grid ── */}
        <View style={styles.servicesSection}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('home.services')}
          </Text>
          <View style={styles.grid}>
            {SERVICES.map(svc => {
              const disabled = !svc.tab && !svc.screenTab && !svc.homeScreen;
              return (
                <TouchableOpacity
                  key={svc.labelKey}
                  activeOpacity={disabled ? 1 : 0.7}
                  style={[
                    styles.card,
                    {backgroundColor: theme.surface, borderColor: theme.border},
                    disabled && styles.cardDisabled,
                  ]}
                  onPress={() => handleServicePress(svc)}>
                  <Text style={[styles.cardIcon, disabled && styles.disabledOpacity]}>{svc.icon}</Text>
                  <Text
                    style={[styles.cardLabel, {color: disabled ? theme.textSecondary : theme.text}]}
                    numberOfLines={2}
                    adjustsFontSizeToFit>
                    {t(svc.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_SIZE = '30.5%';

const styles = StyleSheet.create({
  container: {flex: 1},

  // Header
  header: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {fontSize: fontSize.xl, fontWeight: '700', color: colors.white},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  headerIconBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 34,
    alignItems: 'center',
  },
  headerIconText: {color: colors.white, fontSize: 13, fontWeight: '700'},
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: radius.round,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {color: colors.white, fontSize: 8, fontWeight: '700'},

  // Profile row in header
  profileRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  avatar: {width: 48, height: 48, borderRadius: 24},
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {fontSize: fontSize.xl, color: colors.white, fontWeight: '700'},
  profileName: {fontSize: fontSize.md, fontWeight: '700', color: colors.white},
  profileSub: {fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2},

  // Leave balance card
  leaveCard: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  leaveRow: {flexDirection: 'row', justifyContent: 'space-around'},
  leaveItem: {flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs},
  leaveNum: {fontSize: fontSize.xxl, fontWeight: '700'},
  leaveName: {fontSize: fontSize.xs, textAlign: 'center'},
  barTrack: {height: 4, width: '100%', borderRadius: 2, overflow: 'hidden'},
  barFill: {height: 4, borderRadius: 2},
  leaveSkeleton: {width: 60, height: 40, borderRadius: radius.sm},

  // Services section
  servicesSection: {paddingHorizontal: spacing.md, paddingBottom: spacing.xl},
  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  card: {
    width: CARD_SIZE,
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  cardIcon: {fontSize: 26},
  cardLabel: {fontSize: 11, fontWeight: '600', textAlign: 'center'},
  cardDisabled: {opacity: 0.4},
  disabledOpacity: {opacity: 0.5},
});
