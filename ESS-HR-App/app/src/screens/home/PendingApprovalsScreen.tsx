import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {useAppSelector} from '../../hooks/useAppSelector';
import AccessDenied from '../../components/common/AccessDenied';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {PendingApproval, ApprovalType} from '../../api/types/pending-approvals';
import {API_MAP} from '../../api/apiMap';

type Filter = 'all' | 'leave' | 'expense' | 'loan' | 'other' | 'business_service' | 'hr_request';

const TYPE_COLORS: Record<ApprovalType, string> = {
  leave: colors.primary,
  expense: colors.warning,
  loan: colors.success,
  advance_salary: '#9c27b0',
  business_service: '#FF6B35',
  hr_request: '#5AC8FA',
};

function typeLabel(type: ApprovalType, t: any): string {
  if (type === 'leave') {return t('pendingApprovals.leaveRequest');}
  if (type === 'expense') {return t('pendingApprovals.expense');}
  if (type === 'loan') {return t('pendingApprovals.loan');}
  if (type === 'business_service') {return t('pendingApprovals.businessService', 'Business Service');}
  if (type === 'hr_request') {return t('pendingApprovals.hrRequest', 'HR Request');}
  return t('pendingApprovals.advanceSalary');
}

function navigateToRecord(navigation: any, item: PendingApproval) {
  // PendingApprovals lives in HomeStack → parent is the tab navigator
  const tabNav = navigation.getParent() ?? navigation;

  switch (item.type) {
    case 'leave':
      tabNav.navigate('LeavesTab', {screen: 'LeaveDetail', params: {id: item.id}});
      break;
    case 'expense':
      tabNav.navigate('MoreTab', {screen: 'ExpenseDetail', params: {id: item.id}});
      break;
    case 'loan':
      tabNav.navigate('MoreTab', {screen: 'LoanDetail', params: {id: item.id}});
      break;
    case 'advance_salary':
      tabNav.navigate('MoreTab', {screen: 'AdvanceSalaryDetail', params: {id: item.id}});
      break;
    case 'business_service':
      tabNav.navigate('MoreTab', {screen: 'BusinessServiceDetail', params: {id: item.id}});
      break;
    case 'hr_request': {
      const screenMap = {
        hr_letter:        'HRLetterDetail',
        document_request: 'DocumentRequestDetail',
        experience_cert:  'ExperienceCertDetail',
      } as const;
      const screen = item.record_type ? screenMap[item.record_type] : 'HRLetterDetail';
      tabNav.navigate('MoreTab', {screen, params: {id: item.id}});
      break;
    }
  }
}

export default function PendingApprovalsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {canAccessPendingApprovals, canApproveHRRequests, canApproveBusinessService} = useRBAC();
  const {showError} = useApiError();
  const [filter, setFilter] = useState<Filter>('all');
  const [acting, setActing] = useState<{id: number; action: 'approve' | 'refuse'} | null>(null);
  const userRole = useAppSelector(state => state.auth.user?.role);

  // Hook must be called unconditionally — disabled when no access
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['pending-approvals'],
    enabled: canAccessPendingApprovals,
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.pendingApprovals.list);
      return isApiSuccess(res.data) ? (res.data.data as PendingApproval[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({id, action, type}: {id: number; action: 'approve' | 'refuse'; type: string}) => {
      const res = await apiClient.post(API_MAP.pendingApprovals.action(id), {action, type});
      return res.data;
    },
    onSuccess: (_data, variables) => {
      setActing(null);
      queryClient.invalidateQueries({queryKey: ['pending-approvals']});
      const label = variables.action === 'approve'
        ? t('leave.actions.approve')
        : t('leave.actions.refuse');
      Alert.alert(t('common.done'), `${label} ✓`);
    },
    onError: (err) => { setActing(null); showError(err); },
  });

  if (!canAccessPendingApprovals) {
    return <AccessDenied />;
  }

  // Filter items to only those the current role can approve
  const roleFiltered = (data ?? []).filter(item => {
    if (item.type === 'hr_request') {return canApproveHRRequests;}
    if (item.type === 'business_service') {return canApproveBusinessService;}
    return true;
  });

  const filtered = roleFiltered.filter(item => {
    if (filter === 'all') {return true;}
    if (filter === 'leave') {return item.type === 'leave';}
    if (filter === 'expense') {return item.type === 'expense';}
    if (filter === 'loan') {return item.type === 'loan';}
    if (filter === 'business_service') {return item.type === 'business_service';}
    if (filter === 'hr_request') {return item.type === 'hr_request';}
    return item.type === 'advance_salary';
  });

  const countAll = roleFiltered.length;
  const countLeave = roleFiltered.filter(i => i.type === 'leave').length;
  const countExpense = roleFiltered.filter(i => i.type === 'expense').length;
  const countLoan = roleFiltered.filter(i => i.type === 'loan').length;
  const countOther = roleFiltered.filter(i => i.type === 'advance_salary').length;
  const countBusinessService = roleFiltered.filter(i => i.type === 'business_service').length;
  const countHRRequest = roleFiltered.filter(i => i.type === 'hr_request').length;

  const tabs: {key: Filter; label: string; count: number}[] = [
    {key: 'all', label: t('pendingApprovals.all'), count: countAll},
    {key: 'leave', label: t('pendingApprovals.leaves'), count: countLeave},
    {key: 'expense', label: t('pendingApprovals.expenses'), count: countExpense},
    {key: 'loan', label: t('pendingApprovals.loans'), count: countLoan},
    {key: 'other', label: t('pendingApprovals.other'), count: countOther},
    ...(canApproveBusinessService ? [{key: 'business_service' as Filter, label: t('pendingApprovals.businessService', 'Business Service'), count: countBusinessService}] : []),
    ...(canApproveHRRequests ? [{key: 'hr_request' as Filter, label: t('pendingApprovals.hrRequest', 'HR Requests'), count: countHRRequest}] : []),
  ];

  function handleAction(item: PendingApproval, action: 'approve' | 'refuse') {
    const label = action === 'approve' ? t('leave.actions.approve') : t('leave.actions.refuse');
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: () => {
        setActing({id: item.id, action});
        const type = item.type === 'hr_request'
          ? (item.record_type === 'document_request' ? 'document_request'
            : item.record_type === 'experience_cert' ? 'experience_certificate'
            : 'hr_letter')
          : item.type;
        mutation.mutate({id: item.id, action, type});
      }},
    ]);
  }

  function renderCard(item: PendingApproval) {
    const tColor = TYPE_COLORS[item.type];
    // For leave cards shown to HR/admin: display which approval stage this leave is at
    const isHRView = (userRole === 'hr' || userRole === 'admin') && item.type === 'leave';
    const stageLabel = isHRView
      ? item.state === 'validate1'
        ? t('pendingApprovals.awaitingHR', 'Awaiting HR Approval')
        : t('pendingApprovals.awaitingManager', 'Awaiting Manager')
      : null;

    const isActingOnThis = acting?.id === item.id;

    return (
      <TouchableOpacity
        key={String(item.id)}
        activeOpacity={0.75}
        style={[
          styles.card,
          {backgroundColor: theme.surface, borderColor: theme.border},
          mutation.isPending && styles.cardDisabled,
        ]}
        disabled={mutation.isPending}
        onPress={() => navigateToRecord(navigation, item)}>
        <View style={styles.cardHeader}>
          <Text style={[styles.typeLabel, {color: tColor}]}>{typeLabel(item.type, t)}</Text>
          <View style={styles.cardHeaderRight}>
            {stageLabel ? (
              <Text style={[styles.stageChip, {
                backgroundColor: item.state === 'validate1' ? colors.primary + '22' : colors.warning + '22',
                color: item.state === 'validate1' ? colors.primary : colors.warning,
              }]}>{stageLabel}</Text>
            ) : null}
            <Text style={[styles.chevron, {color: theme.textSecondary}]}>›</Text>
          </View>
        </View>
        <Text style={[styles.employeeName, {color: theme.text}]}>
          {item.employee_name}
        </Text>
        <Text style={[styles.details, {color: theme.textSecondary}]}>
          {item.description}
        </Text>
        <View style={styles.actionRow}>
          {(['approve', 'refuse'] as const).map(action => {
            const isThisOne = isActingOnThis && acting?.action === action;
            return (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionBtn,
                  {backgroundColor: action === 'approve' ? colors.success : colors.error},
                  mutation.isPending && styles.actionBtnDisabled,
                ]}
                onPress={e => { e.stopPropagation?.(); handleAction(item, action); }}
                disabled={mutation.isPending}>
                {isThisOne
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.actionBtnText}>
                      {action === 'approve' ? '✓ ' : '✗ '}
                      {action === 'approve' ? t('leave.actions.approve') : t('leave.actions.refuse')}
                    </Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  }

  function renderList() {
    const isHRLeaveView =
      (userRole === 'hr' || userRole === 'admin') && filter === 'leave';

    if (isHRLeaveView) {
      // HR sees leaves split into two sections: Awaiting Manager | Awaiting HR
      const awaitingManager = filtered.filter(i => i.type === 'leave' && i.state === 'confirm');
      const awaitingHR = filtered.filter(i => i.type === 'leave' && i.state === 'validate1');
      const sections = [
        {
          title: t('pendingApprovals.awaitingManager', 'Awaiting Manager Approval'),
          data: awaitingManager,
          titleColor: colors.warning,
        },
        {
          title: t('pendingApprovals.awaitingHR', 'Awaiting HR Approval'),
          data: awaitingHR,
          titleColor: colors.primary,
        },
      ].filter(s => s.data.length > 0);

      return (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title={t('common.noData')} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          renderSectionHeader={({section}) => (
            <View style={[styles.sectionHeader, {backgroundColor: theme.background}]}>
              <View style={[styles.sectionDot, {backgroundColor: section.titleColor}]} />
              <Text style={[styles.sectionTitle, {color: section.titleColor}]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({item}) => renderCard(item)}
        />
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title={t('common.noData')} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        renderItem={({item}) => renderCard(item)}
      />
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={t('pendingApprovals.title')}
        showBack
        right={
          roleFiltered.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{roleFiltered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <View style={[styles.tabBar, {borderBottomColor: theme.border, backgroundColor: theme.surface}]}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={tab => tab.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          renderItem={({item: tab}) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                style={[styles.tab, isActive && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}
                onPress={() => setFilter(tab.key)}>
                <Text style={[styles.tabText, {color: isActive ? colors.primary : theme.textSecondary}]}>
                  {tab.label}
                  {tab.count > 0 ? ` (${tab.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={100} style={styles.skeleton} />)}
        </View>
      ) : renderList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},

  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},

  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardHeaderRight: {flexDirection: 'row', alignItems: 'center', gap: 6},
  typeLabel: {fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase'},
  stageChip: {fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  chevron: {fontSize: 20},

  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs, paddingHorizontal: spacing.md},
  sectionDot: {width: 8, height: 8, borderRadius: 4},
  sectionTitle: {fontSize: fontSize.sm, fontWeight: '700'},
  employeeName: {fontSize: fontSize.md, fontWeight: '700'},
  details: {fontSize: fontSize.sm},
  actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs},
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  actionBtnDisabled: {opacity: 0.4},
  cardDisabled: {opacity: 0.6},
});
