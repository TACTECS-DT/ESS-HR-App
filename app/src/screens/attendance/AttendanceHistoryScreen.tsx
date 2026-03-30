import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
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
import type {AttendanceRecord} from '../../api/mocks/attendance.mock';
import {API_MAP} from '../../api/apiMap';

type FilterPeriod = 'this_month' | 'last_month' | 'custom';

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins}m`;
}

function isLateCheckIn(checkIn: string | null): boolean {
  if (!checkIn) {return false;}
  const [h, m] = checkIn.split(':').map(Number);
  return h > 9 || (h === 9 && m > 5);
}

export default function AttendanceHistoryScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const [period, setPeriod] = useState<FilterPeriod>('this_month');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['attendance-history'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.attendance.history);
      if (!isApiSuccess(res.data)) {return [];}
      const payload = res.data.data as any;
      const records: any[] = Array.isArray(payload) ? payload : (payload?.records ?? []);
      return records.map((r): AttendanceRecord => {
        const checkInDt: string | null = r.check_in ?? null;
        const checkOutDt: string | null = r.check_out ?? null;
        const dateStr: string = checkInDt ? checkInDt.substring(0, 10) : (r.date ?? '');
        const checkInTime: string | null = checkInDt ? checkInDt.substring(11, 16) : null;
        const checkOutTime: string | null = checkOutDt ? checkOutDt.substring(11, 16) : null;
        return {
          id: r.id,
          date: dateStr,
          check_in: checkInTime,
          check_out: checkOutTime,
          worked_hours: r.worked_hours ?? 0,
          day_status: r.day_status ?? (checkInDt ? 'present' : 'absent'),
          sheet_status: r.sheet_status ?? 'draft',
        };
      });
    },
  });

  const stats = useMemo(() => {
    if (!data) {return {present: 0, absent: 0, late: 0, totalHours: 0};}
    return data.reduce(
      (acc, r) => ({
        present: acc.present + (r.day_status === 'present' ? 1 : 0),
        absent: acc.absent + (r.day_status === 'absent' ? 1 : 0),
        late: acc.late + (r.day_status === 'present' && isLateCheckIn(r.check_in) ? 1 : 0),
        totalHours: acc.totalHours + r.worked_hours,
      }),
      {present: 0, absent: 0, late: 0, totalHours: 0},
    );
  }, [data]);

  const FILTERS: {key: FilterPeriod; label: string}[] = [
    {key: 'this_month', label: t('attendance.filterThisMonth')},
    {key: 'last_month', label: t('attendance.filterLastMonth')},
    {key: 'custom', label: t('attendance.filterCustom')},
  ];

  function renderBadge(item: AttendanceRecord) {
    const late = isLateCheckIn(item.check_in);
    if (item.day_status === 'present') {
      const bg = late ? colors.warning + '22' : colors.success + '22';
      const color = late ? colors.warning : colors.success;
      const label = late ? t('attendance.late') : t('attendance.onTime');
      return (
        <View style={[styles.badge, {backgroundColor: bg}]}>
          <Text style={[styles.badgeText, {color}]}>{label}</Text>
        </View>
      );
    }
    if (item.day_status === 'absent') {
      return (
        <View style={[styles.badge, {backgroundColor: colors.error + '22'}]}>
          <Text style={[styles.badgeText, {color: colors.error}]}>{t('attendance.status.absent')}</Text>
        </View>
      );
    }
    if (item.day_status === 'weekend') {
      return (
        <View style={[styles.badge, {backgroundColor: theme.border}]}>
          <Text style={[styles.badgeText, {color: theme.textSecondary}]}>{t('attendance.status.weekend')}</Text>
        </View>
      );
    }
    if (item.day_status === 'public_holiday') {
      return (
        <View style={[styles.badge, {backgroundColor: colors.info + '22'}]}>
          <Text style={[styles.badgeText, {color: colors.info}]}>{t('attendance.status.public_holiday')}</Text>
        </View>
      );
    }
    if (item.day_status === 'on_leave') {
      return (
        <View style={[styles.badge, {backgroundColor: colors.primary + '22'}]}>
          <Text style={[styles.badgeText, {color: colors.primary}]}>{t('attendance.status.on_leave')}</Text>
        </View>
      );
    }
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('attendance.history')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => (
            <LoadingSkeleton key={i} height={68} style={styles.skeleton} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('attendance.history')} showBack />

      {/* Filter tabs */}
      <View style={[styles.filterRow, {borderBottomColor: theme.border}]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              period === f.key && {borderBottomColor: colors.primary, borderBottomWidth: 2},
            ]}
            onPress={() => setPeriod(f.key)}>
            <Text
              style={[
                styles.filterText,
                {color: period === f.key ? colors.primary : theme.textSecondary},
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary stats card */}
      <View style={[styles.statsCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, {color: colors.success}]}>{stats.present}</Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{t('attendance.status.present')}</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: theme.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, {color: colors.error}]}>{stats.absent}</Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{t('attendance.status.absent')}</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: theme.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, {color: colors.warning}]}>{stats.late}</Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{t('attendance.late')}</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: theme.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, {color: colors.primary}]}>{Math.round(stats.totalHours)}h</Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{t('attendance.totalHours')}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState title={t('common.noData')} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <View style={[styles.row, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            <View style={styles.leftCol}>
              <Text style={[styles.dateText, {color: theme.text}]}>
                {formatDate(item.date, i18n.language)}
              </Text>
              <Text style={[styles.subText, {color: theme.textSecondary}]}>
                {item.check_in
                  ? `${item.check_in} – ${item.check_out ?? '--:--'}`
                  : t(`attendance.status.${item.day_status}`)}
              </Text>
            </View>
            <View style={styles.rightCol}>
              {item.check_in ? (
                <Text
                  style={[
                    styles.hoursText,
                    {color: isLateCheckIn(item.check_in) ? colors.warning : colors.success},
                  ]}>
                  {formatHours(item.worked_hours)}
                </Text>
              ) : null}
              {renderBadge(item)}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterText: {fontSize: fontSize.sm, fontWeight: '600'},

  statsCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statItem: {flex: 1, alignItems: 'center', gap: 2},
  statNum: {fontSize: fontSize.xl, fontWeight: '700'},
  statLabel: {fontSize: 10},
  statDivider: {width: 1, marginVertical: 4},

  list: {padding: spacing.md, gap: spacing.sm},
  row: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {flex: 1, gap: 3},
  dateText: {fontSize: fontSize.sm, fontWeight: '600'},
  subText: {fontSize: fontSize.xs},
  rightCol: {alignItems: 'flex-end', gap: spacing.xs},
  hoursText: {fontSize: fontSize.sm, fontWeight: '700'},
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  badgeText: {fontSize: fontSize.xs, fontWeight: '600'},
});
