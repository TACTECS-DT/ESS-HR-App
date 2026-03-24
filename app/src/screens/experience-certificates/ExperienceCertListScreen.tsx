import React, {useState} from 'react';
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
import type {ExperienceCertificate} from '../../api/mocks/experience-certificates.mock';

type Nav = StackNavigationProp<RequestsStackParamList>;
type Filter = 'all' | 'draft' | 'my_requests';

export default function ExperienceCertListScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('all');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['experience-certs'],
    queryFn: async () => {
      const res = await apiClient.get('/experience-certificates');
      return isApiSuccess(res.data) ? (res.data.data as ExperienceCertificate[]) : [];
    },
  });

  const allItems = data ?? [];
  const filtered = allItems.filter(item => {
    if (filter === 'draft') {return item.status === 'draft';}
    if (filter === 'my_requests') {return item.status !== 'draft';}
    return true;
  });

  const tabs: {key: Filter; label: string}[] = [
    {key: 'all', label: t('common.all')},
    {key: 'draft', label: t('common.status.draft')},
    {key: 'my_requests', label: t('common.myRequests')},
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('expCert.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={70} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('expCert.title')} showBack />

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
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            title={t('common.noData')}
            actionLabel={t('expCert.request')}
            onAction={() => navigation.navigate('ExperienceCertCreate')}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate('ExperienceCertDetail', {id: item.id})}>
            <View style={styles.cardTop}>
              <Text style={[styles.directedTo, {color: theme.text}]} numberOfLines={1}>
                {item.title}
              </Text>
              <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
            </View>
            <Text style={[styles.employee, {color: theme.textSecondary}]}>
              👤 {item.employee}
            </Text>
            <Text style={[styles.detail, {color: theme.textSecondary}]}>
              {item.request_date}{'  ·  '}{item.directed_to}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('ExperienceCertCreate')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: 90},
  card: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  directedTo: {fontSize: fontSize.md, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  employee: {fontSize: fontSize.xs},
  detail: {fontSize: fontSize.sm},
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
