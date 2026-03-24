import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
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
import AccessDenied from '../../components/common/AccessDenied';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {PendingApproval, ApprovalType} from '../../api/mocks/pending-approvals.mock';

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
      tabNav.navigate('LeavesTab', {screen: 'LeaveDetail', params: {id: item.record_id}});
      break;
    case 'expense':
      tabNav.navigate('MoreTab', {screen: 'ExpenseDetail', params: {id: item.record_id}});
      break;
    case 'loan':
      tabNav.navigate('MoreTab', {screen: 'LoanDetail', params: {id: item.record_id}});
      break;
    case 'advance_salary':
      tabNav.navigate('MoreTab', {screen: 'AdvanceSalaryDetail', params: {id: item.record_id}});
      break;
    case 'business_service':
      tabNav.navigate('MoreTab', {screen: 'BusinessServiceDetail', params: {id: item.record_id}});
      break;
    case 'hr_request': {
      const screenMap = {
        hr_letter:        'HRLetterDetail',
        document_request: 'DocumentRequestDetail',
        experience_cert:  'ExperienceCertDetail',
      } as const;
      const screen = item.record_type ? screenMap[item.record_type] : 'HRLetterDetail';
      tabNav.navigate('MoreTab', {screen, params: {id: item.record_id}});
      break;
    }
  }
}

export default function PendingApprovalsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const {canAccessPendingApprovals, canApproveHRRequests, canApproveBusinessService} = useRBAC();
  const [filter, setFilter] = useState<Filter>('all');

  // Hook must be called unconditionally — disabled when no access
  const {data, isLoading} = useQuery({
    queryKey: ['pending-approvals'],
    enabled: canAccessPendingApprovals,
    queryFn: async () => {
      const res = await apiClient.get('/pending-approvals');
      return isApiSuccess(res.data) ? (res.data.data as PendingApproval[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({id, action}: {id: number; action: 'approve' | 'refuse'}) => {
      const res = await apiClient.post(`/pending-approvals/${id}/action`, {action});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pending-approvals']});
    },
    onError: () => Alert.alert(t('common.error')),
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
      {text: label, onPress: () => mutation.mutate({id: item.id, action})},
    ]);
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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title={t('common.noData')} />}
          renderItem={({item}) => {
            const tColor = TYPE_COLORS[item.type];
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
                onPress={() => navigateToRecord(navigation, item)}>
                {/* Header row: type label + chevron */}
                <View style={styles.cardHeader}>
                  <Text style={[styles.typeLabel, {color: tColor}]}>
                    {typeLabel(item.type, t)}
                  </Text>
                  <Text style={[styles.chevron, {color: theme.textSecondary}]}>›</Text>
                </View>
                {/* Employee + details */}
                <Text style={[styles.employeeName, {color: theme.text}]}>
                  {isAr ? item.employee_ar : item.employee}
                </Text>
                <Text style={[styles.details, {color: theme.textSecondary}]}>
                  {isAr ? item.details_ar : item.details}
                </Text>
                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, {backgroundColor: colors.success}]}
                    onPress={e => { e.stopPropagation?.(); handleAction(item, 'approve'); }}
                    disabled={mutation.isPending}>
                    <Text style={styles.actionBtnText}>{'✓ '}{t('leave.actions.approve')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, {backgroundColor: colors.error}]}
                    onPress={e => { e.stopPropagation?.(); handleAction(item, 'refuse'); }}
                    disabled={mutation.isPending}>
                    <Text style={styles.actionBtnText}>{'✗ '}{t('leave.actions.refuse')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  typeLabel: {fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase'},
  chevron: {fontSize: 20},
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
});
