import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import AccessDenied from '../../components/common/AccessDenied';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TeamAttendanceRecord} from '../../api/mocks/attendance.mock';

const STATUS_COLOR: Record<string, string> = {
  checked_in:  colors.success,
  checked_out: '#636366',
  absent:      colors.error,
};

export default function AttendanceTeamScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';
  const {canViewTeamAttendance} = useRBAC();
  const [search, setSearch] = useState('');

  const {data, isLoading} = useQuery({
    queryKey: ['attendance-team'],
    enabled: canViewTeamAttendance,
    queryFn: async () => {
      const res = await apiClient.get('/attendance/team');
      return isApiSuccess(res.data) ? (res.data.data as TeamAttendanceRecord[]) : [];
    },
  });

  const records = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) {return records;}
    const q = search.toLowerCase();
    return records.filter(r =>
      r.employee_name.toLowerCase().includes(q) ||
      r.employee_name_ar.includes(search) ||
      r.badge_id.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q),
    );
  }, [records, search]);

  // Summary counts
  const checkedIn  = records.filter(r => r.status === 'checked_in').length;
  const checkedOut = records.filter(r => r.status === 'checked_out').length;
  const absent     = records.filter(r => r.status === 'absent').length;

  if (!canViewTeamAttendance) {
    return <AccessDenied />;
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('attendance.teamAttendance', 'Team Attendance')} showBack />

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <View style={[styles.pill, {backgroundColor: colors.success + '20'}]}>
          <Text style={[styles.pillCount, {color: colors.success}]}>{checkedIn}</Text>
          <Text style={[styles.pillLabel, {color: colors.success}]}>{t('attendance.checkedIn', 'In')}</Text>
        </View>
        <View style={[styles.pill, {backgroundColor: '#63636620'}]}>
          <Text style={[styles.pillCount, {color: '#636366'}]}>{checkedOut}</Text>
          <Text style={[styles.pillLabel, {color: '#636366'}]}>{t('attendance.checkedOut', 'Out')}</Text>
        </View>
        <View style={[styles.pill, {backgroundColor: colors.error + '20'}]}>
          <Text style={[styles.pillCount, {color: colors.error}]}>{absent}</Text>
          <Text style={[styles.pillLabel, {color: colors.error}]}>{t('attendance.absent', 'Absent')}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, {backgroundColor: theme.surface, borderColor: theme.border}]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, {color: theme.text}]}
          placeholder={t('common.search', 'Search...')}
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={[styles.clearBtn, {color: theme.textSecondary}]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => <LoadingSkeleton key={i} height={64} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.employee_id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title={t('common.noData')} />}
          renderItem={({item}) => {
            const name       = isAr ? item.employee_name_ar : item.employee_name;
            const dept       = isAr ? item.department_ar    : item.department;
            const statusColor = STATUS_COLOR[item.status] ?? '#636366';
            const timeStr    = item.check_in
              ? item.check_out
                ? `${item.check_in} – ${item.check_out}`
                : `${item.check_in} →`
              : '—';

            return (
              <View style={[styles.row, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                {/* Status dot */}
                <View style={[styles.dot, {backgroundColor: statusColor}]} />
                {/* Info */}
                <View style={styles.info}>
                  <Text style={[styles.name, {color: theme.text}]}>{name}</Text>
                  <Text style={[styles.sub, {color: theme.textSecondary}]} numberOfLines={1}>
                    {dept} · {item.badge_id}
                  </Text>
                </View>
                {/* Time & hours */}
                <View style={styles.right}>
                  <Text style={[styles.time, {color: theme.text}]}>{timeStr}</Text>
                  {item.worked_hours > 0 ? (
                    <Text style={[styles.hours, {color: theme.textSecondary}]}>
                      {item.worked_hours.toFixed(1)}h
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  pill: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  pillCount: {fontSize: fontSize.xl, fontWeight: '700'},
  pillLabel: {fontSize: fontSize.xs, fontWeight: '600'},

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: {fontSize: 16},
  searchInput: {flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.sm},
  clearBtn: {fontSize: 14, paddingHorizontal: spacing.xs},

  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  list: {paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dot: {width: 10, height: 10, borderRadius: 5},
  info: {flex: 1, gap: 2},
  name: {fontSize: fontSize.sm, fontWeight: '600'},
  sub: {fontSize: fontSize.xs},
  right: {alignItems: 'flex-end', gap: 2},
  time: {fontSize: fontSize.xs, fontWeight: '600'},
  hours: {fontSize: fontSize.xs},
});
