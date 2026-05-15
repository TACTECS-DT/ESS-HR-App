import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LeaveBalance} from '../../api/mocks/leave.mock';
import {API_MAP} from '../../api/apiMap';

const BAR_COLORS = [colors.primary, colors.warning, colors.success, '#9c27b0', colors.info, '#ff5722'];

export default function LeaveBalanceScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';

  const {data: balances, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.balances);
      return isApiSuccess(res.data) ? (res.data.data as LeaveBalance[]) : [];
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('leave.balance')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={72} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  const items = balances ?? [];

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('leave.balance')} showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.content}>

        {items.length === 0 ? (
          <EmptyState title={t('common.noData')} />
        ) : (
          items.map((b, idx) => {
            const barColor = BAR_COLORS[idx % BAR_COLORS.length];
            // allocated=0 means unlimited (no allocation required)
            const isUnlimited = b.allocated === 0;
            const pct = isUnlimited ? 0 : Math.min(b.used / b.allocated, 1);
            const typeName = isAr ? b.leave_type_name_ar : b.leave_type_name;

            return (
              <View
                key={b.leave_type_id}
                style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>

                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.colorDot, {backgroundColor: barColor}]} />
                  <Text style={[styles.typeName, {color: theme.text}]} numberOfLines={1}>
                    {typeName}
                  </Text>
                  {isUnlimited ? (
                    <Text style={[styles.unlimited, {color: colors.success}]}>
                      {t('leave.noLimit', 'Unlimited')}
                    </Text>
                  ) : (
                    <Text style={[styles.ratio, {color: theme.textSecondary}]}>
                      {b.remaining} / {b.allocated} {t('leave.days')}
                    </Text>
                  )}
                </View>

                {/* Progress bar */}
                {!isUnlimited ? (
                  <View style={[styles.track, {backgroundColor: theme.border}]}>
                    <View
                      style={[
                        styles.fill,
                        {width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor},
                      ]}
                    />
                  </View>
                ) : null}

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <StatPill label={t('leave.used', 'Used')} value={b.used} color={colors.error} theme={theme} />
                  {b.pending > 0 ? (
                    <StatPill label={t('leave.pending', 'Pending')} value={b.pending} color={colors.warning} theme={theme} />
                  ) : null}
                  {!isUnlimited ? (
                    <StatPill label={t('leave.remaining', 'Remaining')} value={b.remaining} color={colors.success} theme={theme} />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function StatPill({label, value, color, theme}: {label: string; value: number; color: string; theme: any}) {
  return (
    <View style={[styles.pill, {backgroundColor: color + '18'}]}>
      <Text style={[styles.pillValue, {color}]}>{value}</Text>
      <Text style={[styles.pillLabel, {color: theme.textSecondary}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  typeName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  ratio: {fontSize: fontSize.sm, fontWeight: '600'},
  unlimited: {fontSize: fontSize.sm, fontWeight: '600'},

  track: {height: 8, borderRadius: 4, overflow: 'hidden'},
  fill: {height: 8, borderRadius: 4},

  statsRow: {flexDirection: 'row', gap: spacing.sm},
  pill: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  pillValue: {fontSize: fontSize.md, fontWeight: '700'},
  pillLabel: {fontSize: fontSize.xs},
});
