import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
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
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Loan, LoanRules} from '../../api/mocks/loan.mock';

type Nav = StackNavigationProp<RequestsStackParamList>;

export default function LoanListScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const {data: rules} = useQuery({
    queryKey: ['loan-rules'],
    queryFn: async () => {
      const res = await apiClient.get('/loans/rules');
      return isApiSuccess(res.data) ? (res.data.data as LoanRules) : null;
    },
  });

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const res = await apiClient.get('/loans');
      return isApiSuccess(res.data) ? (res.data.data as Loan[]) : [];
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('loan.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={90} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('loan.title')} showBack />

      <FlatList
        data={data}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListHeaderComponent={
          rules ? (
            <View style={[styles.infoCard, {backgroundColor: colors.primary + '12', borderColor: colors.primary + '33'}]}>
              <Text style={[styles.infoIcon]}>💡</Text>
              <View style={{flex: 1}}>
                <Text style={[styles.infoTitle, {color: colors.primary}]}>
                  {t('loan.maxAmount')}: {rules.max_amount.toLocaleString()} {t('common.sar')}
                </Text>
                <Text style={[styles.infoSub, {color: theme.textSecondary}]}>
                  {rules.eligible ? t('loan.eligible') : (rules.ineligibility_reason ?? t('loan.notEligible'))}
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={t('common.noData')}
            actionLabel={t('loan.apply')}
            onAction={() => navigation.navigate('LoanCreate')}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('LoanDetail', {id: item.id})}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.amount, {color: colors.primary}]}>
                  {item.amount.toLocaleString()} {t('common.sar')}
                </Text>
                <Text style={[styles.detail, {color: theme.textSecondary}]}>
                  {item.duration_months} {t('loan.months')}
                </Text>
              </View>
              <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
            </View>
            <View style={[styles.installRow, {backgroundColor: theme.background, borderRadius: radius.sm}]}>
              <Text style={[styles.installLabel, {color: theme.textSecondary}]}>{t('loan.monthlyInstallment')}:</Text>
              <Text style={[styles.installAmount, {color: theme.text}]}>
                {item.monthly_installment.toLocaleString()} {t('common.sar')}
              </Text>
            </View>
            <Text style={[styles.detail, {color: theme.textSecondary}]}>
              {t('common.date')}: {item.request_date}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('LoanCreate')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: 90},
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  infoIcon: {fontSize: 20},
  infoTitle: {fontSize: fontSize.sm, fontWeight: '700'},
  infoSub: {fontSize: fontSize.xs, marginTop: 2},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  amount: {fontSize: fontSize.lg, fontWeight: '700'},
  installRow: {flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm},
  installLabel: {fontSize: fontSize.sm},
  installAmount: {fontSize: fontSize.sm, fontWeight: '700'},
  detail: {fontSize: fontSize.xs},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
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
