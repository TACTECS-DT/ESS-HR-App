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
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {LeaveRequest, LeaveBalance} from '../../api/mocks/leave.mock';

type Nav = StackNavigationProp<RequestsStackParamList>;
type TabFilter = 'my_leaves' | 'pending' | 'approved' | 'refused';

const BALANCE_COLORS = [colors.primary, colors.warning, colors.success, '#9c27b0', colors.info];

const TABS: {key: TabFilter; labelKey: string}[] = [
  {key: 'my_leaves', labelKey: 'leave.myLeaves'},
  {key: 'pending', labelKey: 'leave.pending'},
  {key: 'approved', labelKey: 'leave.approved'},
  {key: 'refused', labelKey: 'leave.refused'},
];

export default function LeaveListScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const [tab, setTab] = useState<TabFilter>('my_leaves');

  const {data: requests, isLoading: reqLoading, refetch} = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/requests');
      return isApiSuccess(res.data) ? (res.data.data as LeaveRequest[]) : [];
    },
  });

  const {data: balances, isLoading: balLoading} = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return isApiSuccess(res.data) ? (res.data.data as LeaveBalance[]) : [];
    },
  });

  const filtered = (requests ?? []).filter(r => {
    if (tab === 'pending') {return r.status === 'pending';}
    if (tab === 'approved') {return r.status === 'approved';}
    if (tab === 'refused') {return r.status === 'refused';}
    return true;
  });

  const isManager = user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin';

  if (reqLoading || balLoading) {
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
        {TABS.map(t_ => (
          <TouchableOpacity
            key={t_.key}
            style={[
              styles.tab,
              tab === t_.key && {borderBottomColor: colors.primary, borderBottomWidth: 2},
            ]}
            onPress={() => setTab(t_.key)}>
            <Text
              style={[
                styles.tabText,
                {color: tab === t_.key ? colors.primary : theme.textSecondary},
              ]}>
              {t(t_.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>

        {/* Leave Balance Card */}
        <View style={[styles.balanceCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>{t('leave.balance')}</Text>
          {(balances ?? []).map((b, idx) => {
            const pct = b.allocated > 0 ? Math.min(b.used / b.allocated, 1) : 0;
            const barColor = BALANCE_COLORS[idx % BALANCE_COLORS.length];
            return (
              <View key={b.leave_type_id} style={styles.balanceRow}>
                <View style={styles.balanceRowHeader}>
                  <Text style={[styles.balanceType, {color: theme.text}]}>
                    {isAr ? b.leave_type_name_ar : b.leave_type_name}
                  </Text>
                  <Text style={[styles.balanceRatio, {color: theme.textSecondary}]}>
                    {b.used} / {b.allocated} {t('leave.days')}
                  </Text>
                </View>
                <View style={[styles.progressTrack, {backgroundColor: theme.border}]}>
                  <View
                    style={[
                      styles.progressFill,
                      {width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor},
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {isManager ? (
          <TouchableOpacity
            style={[styles.teamBtn, {borderColor: theme.border, backgroundColor: theme.surface}]}
            onPress={() => navigation.navigate('LeaveTeamBalance')}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: '600'}}>
              👥 {t('leave.teamBalance')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Recent Requests */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.recentRequests')}</Text>

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
                  <Text style={[styles.leaveType, {color: theme.text}]}>
                    {isAr ? item.leave_type_ar : item.leave_type}
                  </Text>
                  <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
                </View>
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

  balanceCard: {
    margin: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs},
  balanceRow: {gap: 6},
  balanceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceType: {fontSize: fontSize.sm, fontWeight: '500'},
  balanceRatio: {fontSize: fontSize.xs, fontWeight: '600'},
  progressTrack: {height: 6, borderRadius: 3, overflow: 'hidden'},
  progressFill: {height: 6, borderRadius: 3},

  teamBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {paddingHorizontal: spacing.md, paddingBottom: 90, gap: spacing.sm},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  leaveType: {fontSize: fontSize.md, fontWeight: '700'},
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
