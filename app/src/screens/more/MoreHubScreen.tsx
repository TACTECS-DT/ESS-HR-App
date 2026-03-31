import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '../../hooks/useTheme';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useRBAC} from '../../hooks/useRBAC';
import {clearAuth} from '../../store/slices/authSlice';
import {clearTokens} from '../../utils/secureStorage';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {MoreStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<MoreStackParamList>;

interface ModuleItem {
  icon: string;
  titleKey: string;
  route: keyof MoreStackParamList;
  color: string;
  /** If set, item is hidden unless the role has this permission */
  requiresPermission?: 'canAccessAnalytics' | 'canAccessTeamHours' | 'canViewOtherProfiles';
  /** If set, item is hidden unless this code is in allowedModules (empty list = all allowed) */
  moduleCode?: string;
}

const SECTIONS: Array<{titleKey: string; items: ModuleItem[]}> = [
  {
    titleKey: 'more.financial',
    items: [
      {icon: '🧾', titleKey: 'expense.title',           route: 'ExpenseList',        color: '#FF9500', moduleCode: 'expense'},
      {icon: '🏦', titleKey: 'loan.title',              route: 'LoanList',           color: '#007AFF', moduleCode: 'loan'},
      {icon: '💵', titleKey: 'advanceSalary.title',     route: 'AdvanceSalaryList',  color: '#34C759', moduleCode: 'advance_salary'},
    ],
  },
  {
    titleKey: 'more.hrServices',
    items: [
      {icon: '📄', titleKey: 'hrLetter.title',               route: 'HRLetterList',        color: '#5AC8FA', moduleCode: 'hr_services'},
      {icon: '📋', titleKey: 'documentRequests.title',        route: 'DocumentRequestList', color: '#FF3B30', moduleCode: 'hr_services'},
      {icon: '🎓', titleKey: 'experienceCertificates.title',  route: 'ExperienceCertList',  color: '#AF52DE', moduleCode: 'hr_services'},
      {icon: '🔧', titleKey: 'businessServices.title',        route: 'BusinessServiceList', color: '#FF6B35', moduleCode: 'hr_services'},
    ],
  },
  // Tasks & Timesheets — disabled (work with res.users, not hr.employee — re-enable later)
  // {
  //   titleKey: 'more.tasksTimesheets',
  //   items: [
  //     {icon: '✅', titleKey: 'tasks.title',         route: 'TaskList',        color: '#30B0C7', moduleCode: 'tasks'},
  //     {icon: '🕐', titleKey: 'timesheets.title',    route: 'TimesheetWeekly', color: '#636366'},
  //     {icon: '👥', titleKey: 'teamHours.title',     route: 'TeamHours',       color: '#5856D6', requiresPermission: 'canAccessTeamHours'},
  //     {icon: '⏱️', titleKey: 'timer.title',         route: 'Timer',           color: '#007AFF'},
  //     {icon: '📝', titleKey: 'tasks.logTime',       route: 'LogTime',         color: '#34C759'},
  //     {icon: '📎', titleKey: 'tasks.addAttachment', route: 'AddAttachment',   color: '#FF9500'},
  //   ],
  // },
  {
    titleKey: 'more.personal',
    items: [
      {icon: '📝', titleKey: 'personalNotes.title', route: 'PersonalNotes', color: '#FF9F0A'},
      {icon: '📊', titleKey: 'analytics.title',     route: 'Analytics',     color: '#30D158', requiresPermission: 'canAccessAnalytics', moduleCode: 'analytics'},
    ],
  },
  {
    titleKey: 'more.other',
    items: [
      {icon: '💬', titleKey: 'chat.title',          route: 'ChatHR',            color: '#34C759'},
      {icon: '👤', titleKey: 'profile.title',       route: 'Profile',           color: '#007AFF'},
      {icon: '🗂️', titleKey: 'profile.directory',  route: 'EmployeeDirectory', color: '#5856D6', requiresPermission: 'canViewOtherProfiles'},
      {icon: '⚙️', titleKey: 'settings.title',      route: 'Settings',          color: '#8E8E93'},
    ],
  },
];

export default function MoreHubScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const rbac = useRBAC();
  const allowedModules = useAppSelector(s => s.auth.allowedModules ?? []);

  // Empty allowedModules = all modules permitted (no restrictions from admin).
  function isModuleAllowed(code?: string): boolean {
    if (!code) {return true;}
    if (allowedModules.length === 0) {return true;}
    return allowedModules.some(m => m.code === code);
  }

  // Filter items by both RBAC role and admin-granted module codes.
  const visibleSections = SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.requiresPermission && !rbac[item.requiresPermission]) {return false;}
      return isModuleAllowed(item.moduleCode);
    }),
  })).filter(section => section.items.length > 0);

  async function handleLogout() {
    Alert.alert(t('settings.logout'), `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          dispatch(clearAuth());
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Blue header */}
      <View style={[styles.header, {backgroundColor: colors.primary, paddingTop: insets.top + spacing.sm}]}>
        <Text style={styles.headerTitle}>{t('home.more')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {visibleSections.map(section => (
          <View key={section.titleKey}>
            <Text style={[styles.sectionHeader, {color: theme.textSecondary}]}>
              {t(section.titleKey)}
            </Text>
            <View style={[styles.sectionCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {section.items.map((item, idx) => (
                <View key={item.route}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => navigation.navigate(item.route as any)}>
                    <View style={[styles.iconCircle, {backgroundColor: item.color + '20'}]}>
                      <Text style={styles.icon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.rowLabel, {color: theme.text}]}>{t(item.titleKey)}</Text>
                    <Text style={[styles.arrow, {color: theme.textSecondary}]}>›</Text>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && (
                    <View style={[styles.separator, {backgroundColor: theme.border}]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, {backgroundColor: theme.surface, borderColor: colors.error + '44'}]}
          onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={[styles.logoutText, {color: colors.error}]}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {fontSize: fontSize.xl, fontWeight: '700', color: colors.white},

  scroll: {padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl},
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {fontSize: 18},
  rowLabel: {flex: 1, fontSize: fontSize.md, fontWeight: '500'},
  arrow: {fontSize: 20},
  separator: {height: StyleSheet.hairlineWidth, marginLeft: 68},

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  logoutIcon: {fontSize: 20},
  logoutText: {fontSize: fontSize.md, fontWeight: '700'},
});
