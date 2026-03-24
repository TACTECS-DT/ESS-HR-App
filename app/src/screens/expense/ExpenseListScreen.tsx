import React, {useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import type {StackNavigationProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Expense} from '../../api/mocks/expense.mock';

type Nav = StackNavigationProp<RequestsStackParamList>;
type Filter = 'my' | 'draft' | 'all';

export default function ExpenseListScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const isAr = i18n.language === 'ar';

  const [filter, setFilter] = useState<Filter>('my');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses');
      return isApiSuccess(res.data) ? (res.data.data as Expense[]) : [];
    },
  });

  const filtered = (data ?? []).filter(item => {
    if (filter === 'draft') {return item.status === 'draft';}
    return true;
  });

  const tabs: {key: Filter; label: string}[] = [
    {key: 'my', label: t('expense.myExpenses')},
    {key: 'draft', label: t('common.status.draft')},
    {key: 'all', label: t('leave.all')},
  ];

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('expense.title')} showBack />

      {/* Filter tabs */}
      <View style={[styles.tabBar, {borderBottomColor: theme.border}]}>
        {tabs.map(tab => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setFilter(tab.key)}>
              <Text style={[styles.tabText, {color: isActive ? colors.primary : theme.textSecondary}]}>
                {tab.label}
              </Text>
              {isActive && <View style={[styles.tabUnderline, {backgroundColor: colors.primary}]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            title={t('common.noData')}
            actionLabel={t('expense.create')}
            onAction={() => navigation.navigate('ExpenseCreate')}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('ExpenseDetail', {id: item.id})}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={[styles.name, {color: theme.text}]}>{item.name}</Text>
                <Text style={[styles.sub, {color: theme.textSecondary}]}>
                  {item.date} {'|'} {isAr ? item.category_ar : item.category}
                </Text>
                <Text style={[styles.employee, {color: theme.textSecondary}]}>
                  👤 {isAr ? item.employee_ar : item.employee}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, {color: theme.text}]}>
                  {item.amount.toLocaleString()} {item.currency}
                </Text>
                <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('ExpenseCreate')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  tabUnderline: {height: 2, width: '60%', borderRadius: 1, marginTop: 4},

  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: 80},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  info: {flex: 1, gap: 2},
  right: {alignItems: 'flex-end', gap: spacing.xs},
  name: {fontSize: fontSize.sm, fontWeight: '600'},
  sub: {fontSize: fontSize.xs},
  employee: {fontSize: fontSize.xs},
  amount: {fontSize: fontSize.sm, fontWeight: '700'},

  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {color: '#fff', fontSize: 26, lineHeight: 30},
});
