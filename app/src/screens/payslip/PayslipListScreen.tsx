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
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Payslip} from '../../api/mocks/payslip.mock';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<RequestsStackParamList>;
type Filter = 'all' | 'this_year' | 'last_year';

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function dateRange(item: Payslip, isAr: boolean): string {
  const daysInMonth = item.month === 2 ? 28 : 30;
  const monthNames = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const monthName = monthNames[item.month - 1];
  if (isAr) {
    return `١ - ${daysInMonth} ${monthName} ${item.year}`;
  }
  return `${monthName} 1 - ${daysInMonth}, ${item.year}`;
}

export default function PayslipListScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const currentYear = new Date().getFullYear();

  const [filter, setFilter] = useState<Filter>('all');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.payslip.list);
      return isApiSuccess(res.data) ? (res.data.data as Payslip[]) : [];
    },
  });

  const filtered = (data ?? []).filter(item => {
    if (filter === 'this_year') {return item.year === currentYear;}
    if (filter === 'last_year') {return item.year === currentYear - 1;}
    return true;
  });

  const tabs: {key: Filter; label: string}[] = [
    {key: 'all', label: t('common.status.done').replace('Done', t('leave.all'))},
    {key: 'this_year', label: t('payslip.thisYear')},
    {key: 'last_year', label: t('payslip.lastYear')},
  ];

  const monthNames = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('payslip.title')} showBack />

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
                {tab.key === 'all' ? t('leave.all') : tab.label}
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
        ListEmptyComponent={<EmptyState title={t('common.noData')} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('PayslipDetail', {id: item.id})}>
            <View style={styles.cardRow}>
              {/* Icon + info */}
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>💰</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.period, {color: theme.text}]}>
                  {monthNames[item.month - 1]} {item.year}
                </Text>
                <Text style={[styles.dateRange, {color: theme.textSecondary}]}>
                  👤 {isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
                </Text>
                <Text style={[styles.dateRange, {color: theme.textSecondary}]}>
                  {dateRange(item, isAr)}
                </Text>
              </View>
              {/* Amount + status */}
              <View style={styles.right}>
                <Text style={[styles.net, {color: colors.success}]}>
                  {item.net.toLocaleString()} {item.currency}
                </Text>
                <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
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

  list: {padding: spacing.md, gap: spacing.sm},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.sm},
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  iconWrap: {width: 40, alignItems: 'center'},
  icon: {fontSize: 24},
  info: {flex: 1, gap: 2},
  period: {fontSize: fontSize.sm, fontWeight: '700'},
  dateRange: {fontSize: fontSize.xs},
  right: {alignItems: 'flex-end', gap: spacing.xs},
  net: {fontSize: fontSize.sm, fontWeight: '700'},
});
