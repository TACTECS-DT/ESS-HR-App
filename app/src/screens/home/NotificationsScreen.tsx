import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AppNotification} from '../../api/mocks/notifications.mock';

const TYPE_ICONS: Record<AppNotification['type'], string> = {
  leave: '🏖',
  payslip: '💰',
  expense: '🧾',
  announcement: '📢',
  task: '✅',
  loan: '🏦',
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) {return 'just now';}
  if (diff < 3600) {return `${Math.floor(diff / 60)}m ago`;}
  if (diff < 86400) {return `${Math.floor(diff / 3600)}h ago`;}
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const {data, isLoading} = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return isApiSuccess(res.data) ? (res.data.data as AppNotification[]) : [];
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({queryKey: ['notifications']}),
  });

  const unreadCount = (data ?? []).filter(n => !n.is_read).length;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={t('notifications.title')}
        showBack
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllMutation.mutate()}>
              <Text style={[styles.markAll, {color: colors.primary}]}>
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map(i => (
            <LoadingSkeleton key={i} width="100%" height={72} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('notifications.empty')} />}
          renderItem={({item}) => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: item.is_read ? theme.surface : colors.primary + '12',
                  borderColor: theme.border,
                },
              ]}>
              <View style={[styles.iconWrap, {backgroundColor: colors.primary + '22'}]}>
                <Text style={styles.icon}>{TYPE_ICONS[item.type]}</Text>
              </View>
              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, {color: theme.text}]}
                    numberOfLines={1}>
                    {isAr ? item.title_ar : item.title}
                  </Text>
                  {!item.is_read && <View style={styles.dot} />}
                </View>
                <Text
                  style={[styles.body, {color: theme.textSecondary}]}
                  numberOfLines={2}>
                  {isAr ? item.body_ar : item.body}
                </Text>
                <Text style={[styles.time, {color: theme.textSecondary}]}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  skeletonWrap: {padding: spacing.md, gap: spacing.sm},
  list: {padding: spacing.md, gap: spacing.sm},
  item: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {fontSize: 18},
  textWrap: {flex: 1, gap: 3},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  title: {fontSize: fontSize.md, fontWeight: '600', flex: 1},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: {fontSize: fontSize.sm},
  time: {fontSize: fontSize.xs, marginTop: 2},
  markAll: {fontSize: fontSize.xs, fontWeight: '600'},
});
