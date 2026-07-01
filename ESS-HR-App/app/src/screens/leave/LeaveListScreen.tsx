import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
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
import type {LeaveRequest} from '../../api/types/leave';
import {API_MAP} from '../../api/apiMap';

type Nav      = StackNavigationProp<LeavesStackParamList>;
type Scope    = 'mine' | 'all';
type StateTab = 'all' | 'confirm' | 'validate' | 'refuse' | 'cancel';

const STATE_TABS: {key: StateTab; labelKey: string}[] = [
  {key: 'all',      labelKey: 'leave.all'},
  {key: 'confirm',  labelKey: 'common.status.confirm'},
  {key: 'validate', labelKey: 'common.status.validate'},
  {key: 'refuse',   labelKey: 'common.status.refuse'},
  {key: 'cancel',   labelKey: 'common.status.cancel'},
];

const SKELETON_ROWS = [0, 1, 2, 3];

export default function LeaveListScreen() {
  const {t, i18n} = useTranslation();
  const theme      = useTheme();
  const navigation = useNavigation<Nav>();
  const {isAtLeastManager, canViewTeamLeaveBalances} = useRBAC();
  const isAr = i18n.language === 'ar';

  const [scope,     setScope]     = useState<Scope>('mine');
  const [stateTab,  setStateTab]  = useState<StateTab>('all');
  const [switching, setSwitching] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  function switchScope(next: Scope) {
    if (next === scope) {return;}
    setSwitching(true);
    // Fade content out first, then swap scope
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setScope(next);
      setStateTab('all');
    });
  }

  const {data: requests, isLoading, isFetching, refetch} = useQuery({
    queryKey: ['leave-requests', scope],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.requests, {params: {scope}});
      return isApiSuccess(res.data) ? (res.data.data as LeaveRequest[]) : [];
    },
  });

  // Fade back in once the new scope's data has settled
  useEffect(() => {
    if (!isFetching && switching) {
      setSwitching(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [isFetching, switching, fadeAnim]);

  const showSkeleton = isLoading || switching;

  const filtered = (requests ?? []).filter(r => {
    if (stateTab === 'confirm')  {return r.status === 'confirm';}
    if (stateTab === 'validate') {return r.status === 'validate1' || r.status === 'validate';}
    if (stateTab === 'refuse')   {return r.status === 'refuse';}
    if (stateTab === 'cancel')   {return r.status === 'cancel';}
    return true;
  });

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('leave.title')} showBack />

      {/* ── Scope switcher (manager / HR only) ── */}
      {isAtLeastManager && (
        <View style={[styles.scopeWrapper, {backgroundColor: theme.background}]}>
          <View style={[styles.scopeTrack, {backgroundColor: theme.isDark ? colors.gray900 : colors.gray200}]}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.scopePill, scope === 'mine' && {backgroundColor: colors.primary}]}
              onPress={() => switchScope('mine')}>
              <Text style={[styles.scopeLabel, {color: scope === 'mine' ? colors.white : theme.textSecondary}]}>
                {t('leave.myLeaves')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.scopePill, scope === 'all' && {backgroundColor: colors.primary}]}
              onPress={() => switchScope('all')}>
              <Text style={[styles.scopeLabel, {color: scope === 'all' ? colors.white : theme.textSecondary}]}>
                {t('leave.allLeaves')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── State filter tabs ── */}
      <View style={[styles.tabRow, {borderBottomColor: theme.border}]}>
        {STATE_TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[
              styles.tab,
              stateTab === tb.key && {borderBottomColor: colors.primary, borderBottomWidth: 2},
            ]}
            onPress={() => setStateTab(tb.key)}>
            <Text style={[styles.tabText, {color: stateTab === tb.key ? colors.primary : theme.textSecondary}]}>
              {t(tb.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Animated content area ── */}
      <Animated.View style={[styles.flex, {opacity: fadeAnim}]}>
        {showSkeleton ? (
          /* Skeleton cards that match real card proportions */
          <View style={[styles.skeletons, {paddingTop: spacing.md}]}>
            {SKELETON_ROWS.map(i => (
              <View
                key={i}
                style={[styles.skeletonCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <View style={styles.skeletonRow}>
                  <LoadingSkeleton height={14} style={styles.skeletonTitle} />
                  <LoadingSkeleton height={20} width={72} style={styles.skeletonChip} />
                </View>
                <LoadingSkeleton height={11} style={styles.skeletonLine} />
                <LoadingSkeleton height={11} width="60%" style={styles.skeletonLine} />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
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
                actionLabel={scope === 'mine' ? t('leave.request') : undefined}
                onAction={scope === 'mine' ? () => navigation.navigate('LeaveCreate') : undefined}
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
        )}
      </Animated.View>

      {/* FAB — only in My Leaves scope */}
      {scope === 'mine' && !showSkeleton && (
        <TouchableOpacity
          style={[styles.fab, {backgroundColor: colors.primary}]}
          onPress={() => navigation.navigate('LeaveCreate')}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  flex:      {flex: 1},

  // Scope switcher — pill / segment control
  scopeWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
  },
  scopeTrack: {
    flexDirection: 'row',
    borderRadius:  radius.round,
    padding:       3,
  },
  scopePill: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: spacing.sm,
    borderRadius:   radius.round,
  },
  scopeLabel: {fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 0.2},

  // State tabs
  tabRow: {
    flexDirection:     'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex:              1,
    alignItems:        'center',
    paddingVertical:   spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {fontSize: fontSize.xs, fontWeight: '600'},

  // Skeleton
  skeletons: {paddingHorizontal: spacing.md, gap: spacing.sm},
  skeletonCard: {
    borderRadius: radius.md,
    borderWidth:  1,
    padding:      spacing.md,
    gap:          spacing.sm,
  },
  skeletonRow:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
  skeletonTitle: {flex: 1, borderRadius: radius.sm},
  skeletonChip:  {borderRadius: radius.round},
  skeletonLine:  {borderRadius: radius.sm},

  listContent: {paddingBottom: 90},

  quickRow: {
    flexDirection:    'row',
    gap:              spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop:       spacing.md,
    paddingBottom:    spacing.sm,
  },
  quickBtn: {
    flex:         1,
    padding:      spacing.sm,
    borderRadius: radius.md,
    borderWidth:  1,
    alignItems:   'center',
  },
  quickBtnText: {fontSize: fontSize.sm, fontWeight: '600'},

  list:     {paddingHorizontal: spacing.md, gap: spacing.sm},
  card:     {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardTop:  {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
  leaveType: {flex: 1, fontSize: fontSize.md, fontWeight: '700'},
  employee:  {fontSize: fontSize.xs},
  dates:     {fontSize: fontSize.sm},
  mode:      {fontSize: fontSize.xs},

  fab: {
    position:     'absolute',
    bottom:       spacing.xl,
    right:        spacing.lg,
    width:        56,
    height:       56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems:   'center',
    elevation:    6,
    shadowColor:  '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
