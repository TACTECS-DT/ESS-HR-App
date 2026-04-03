import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
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
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LeavesStackParamList} from '../../navigation/types';
import type {LeaveRequest} from '../../api/mocks/leave.mock';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<LeavesStackParamList>;
type TabFilter = 'all' | 'pending' | 'approved' | 'refused';

const TABS: {key: TabFilter; labelKey: string}[] = [
  {key: 'all', labelKey: 'leave.myLeaves'},
  {key: 'pending', labelKey: 'leave.pending'},
  {key: 'approved', labelKey: 'leave.approved'},
  {key: 'refused', labelKey: 'leave.refused'},
];

export default function LeaveListScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const {canViewTeamLeaveBalances} = useRBAC();
  const isAr = i18n.language === 'ar';
  const [tab, setTab] = useState<TabFilter>('all');

  const {data: requests, isLoading, refetch} = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.requests);
      return isApiSuccess(res.data) ? (res.data.data as LeaveRequest[]) : [];
    },
  });

  const filtered = (requests ?? []).filter(r => {
    if (tab === 'pending') {return r.status === 'pending';}
    if (tab === 'approved') {return r.status === 'approved' || r.status === 'validated';}
    if (tab === 'refused') {return r.status === 'refused';}
    return true; // 'all'
  });

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('leave.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={68} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('leave.title')} showBack />

      {/* Tabs */}
      <View style={[styles.tabRow, {borderBottomColor: theme.border}]}>
        {TABS.map(tab_ => (
          <TouchableOpacity
            key={tab_.key}
            style={[
              styles.tab,
              tab === tab_.key && {borderBottomColor: colors.primary, borderBottomWidth: 2},
            ]}
            onPress={() => setTab(tab_.key)}>
            <Text
              style={[
                styles.tabText,
                {color: tab === tab_.key ? colors.primary : theme.textSecondary},
              ]}>
              {t(tab_.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}>

        {/* Quick-access buttons */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, {borderColor: theme.border, backgroundColor: theme.surface}]}
            onPress={() => navigation.navigate('LeaveBalance')}>
            <Text style={[styles.quickBtnText, {color: colors.primary}]}>
              📊 {t('leave.balance')}
            </Text>
          </TouchableOpacity>

          {canViewTeamLeaveBalances ? (
            <TouchableOpacity
              style={[styles.quickBtn, {borderColor: theme.border, backgroundColor: theme.surface}]}
              onPress={() => navigation.navigate('LeaveTeamBalance')}>
              <Text style={[styles.quickBtnText, {color: colors.primary}]}>
                👥 {t('leave.teamBalance')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Leave list */}
        {filtered.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            actionLabel={t('leave.request')}
            onAction={() => navigation.navigate('LeaveCreate')}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
                onPress={() => navigation.navigate('LeaveDetail', {id: item.id})}>
                <View style={styles.cardTop}>
                  <Text style={[styles.leaveType, {color: theme.text}]} numberOfLines={1}>
                    {isAr ? item.leave_type_ar : item.leave_type}
                  </Text>
                  <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
                </View>
                <Text style={[styles.employee, {color: theme.textSecondary}]}>
                  👤 {isAr ? item.employee_ar : item.employee}
                </Text>
                <Text style={[styles.dates, {color: theme.textSecondary}]}>
                  📅 {item.date_from} → {item.date_to}
                  {item.duration > 0 ? ` · ${item.duration}d` : ''}
                </Text>
                <Text style={[styles.mode, {color: theme.textSecondary}]}>
                  {t(`leave.mode.${item.mode}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('LeaveCreate')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},

  listContent: {paddingBottom: 90},

  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickBtnText: {fontSize: fontSize.sm, fontWeight: '600'},

  list: {paddingHorizontal: spacing.md, gap: spacing.sm},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
  leaveType: {flex: 1, fontSize: fontSize.md, fontWeight: '700'},
  employee: {fontSize: fontSize.xs},
  dates: {fontSize: fontSize.sm},
  mode: {fontSize: fontSize.xs},

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
