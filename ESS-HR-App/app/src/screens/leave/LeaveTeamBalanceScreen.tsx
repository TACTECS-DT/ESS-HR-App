import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import AccessDenied from '../../components/common/AccessDenied';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TeamMember, TeamMemberStatus} from '../../api/mocks/leave.mock';
import {API_MAP} from '../../api/apiMap';

const STATUS_COLORS: Record<TeamMemberStatus, string> = {
  present: colors.success,
  absent: colors.error,
  on_leave: colors.primary,
  pending: colors.warning,
};

const STATUS_BADGE_BG: Record<TeamMemberStatus, string> = {
  present: colors.success + '22',
  absent: colors.error + '22',
  on_leave: '#e8f0fe',
  pending: colors.warning + '22',
};

const BALANCE_COLORS = [colors.primary, colors.success, colors.warning, '#AF52DE', colors.info];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// getStatusLabel replaced inline with t() calls

type ViewMode = 'status' | 'balances';

export default function LeaveTeamBalanceScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const {canViewTeamLeaveBalances} = useRBAC();

  // Hook must be called unconditionally — disabled when no access
  const {data: team} = useQuery({
    queryKey: ['team-leave-balances'],
    enabled: canViewTeamLeaveBalances,
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.teamBalances);
      return isApiSuccess(res.data) ? (res.data.data as TeamMember[]) : [];
    },
  });

  if (!canViewTeamLeaveBalances) {
    return <AccessDenied />;
  }

  const members = team ?? [];

  const presentCount = members.filter(m => m.status === 'present').length;
  const absentCount = members.filter(m => m.status === 'absent').length;
  const onLeaveCount = members.filter(m => m.status === 'on_leave').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;

  const statItems = [
    {label: t('attendance.status.present'), count: presentCount, color: colors.success},
    {label: t('attendance.status.absent'), count: absentCount, color: colors.error},
    {label: t('attendance.status.on_leave'), count: onLeaveCount, color: colors.primary},
    {label: t('common.status.pending'), count: pendingCount, color: colors.warning},
  ];

  function getSubtitle(member: TeamMember): string {
    if (member.status === 'present' && member.checkin_time) {
      return isAr ? `سجل حضور ${member.checkin_time}` : `Checked in ${member.checkin_time}`;
    }
    if (member.status === 'on_leave') {
      return isAr ? (member.leave_info_ar ?? t('leave.onLeave')) : (member.leave_info ?? t('leave.onLeave'));
    }
    if (member.status === 'pending') {
      return isAr ? (member.leave_info_ar ?? t('leave.pending')) : (member.leave_info ?? t('leave.pending'));
    }
    return t('attendance.noCheckin');
  }

  const isStatusView = viewMode === 'status';

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('leave.teamBalance')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Summary stats card */}
        <View style={[styles.statsCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          {statItems.map(stat => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={[styles.statCount, {color: stat.color}]}>{stat.count}</Text>
              <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Toggle between Status and Balances view */}
        <View style={[styles.toggleRow, {borderColor: theme.border}]}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'status' && {backgroundColor: colors.primary}]}
            onPress={() => setViewMode('status')}>
            <Text style={[styles.toggleText, {color: viewMode === 'status' ? '#fff' : theme.textSecondary}]}>
              {t('common.statusLabel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'balances' && {backgroundColor: colors.primary}]}
            onPress={() => setViewMode('balances')}>
            <Text style={[styles.toggleText, {color: viewMode === 'balances' ? '#fff' : theme.textSecondary}]}>
              {t('leave.balance')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Team members */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.teamMembers')}</Text>

        {isStatusView ? (
          members.map(member => {
            const name = isAr ? member.employee_ar : member.employee;
            const initials = getInitials(member.employee);
            const avatarColor = STATUS_COLORS[member.status];
            const badgeBg = STATUS_BADGE_BG[member.status];

            return (
              <View
                key={member.employee}
                style={[styles.memberRow, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <View style={[styles.avatar, {backgroundColor: avatarColor}]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, {color: theme.text}]}>{name}</Text>
                  <Text style={[styles.memberSub, {color: theme.textSecondary}]} numberOfLines={1}>
                    {getSubtitle(member)}
                  </Text>
                </View>
                <View style={[styles.badge, {backgroundColor: badgeBg}]}>
                  <Text style={[styles.badgeText, {color: avatarColor}]}>
                    {member.status === 'pending'
                      ? t('common.status.pending')
                      : t(`attendance.status.${member.status}`)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          members.map(member => {
            const name = isAr ? member.employee_ar : member.employee;
            const initials = getInitials(member.employee);

            return (
              <View
                key={member.employee}
                style={[styles.balanceCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                {/* Member header */}
                <View style={styles.balanceMemberRow}>
                  <View style={[styles.avatar, {backgroundColor: colors.primary + '44'}]}>
                    <Text style={[styles.avatarText, {color: colors.primary}]}>{initials}</Text>
                  </View>
                  <Text style={[styles.memberName, {color: theme.text}]}>{name}</Text>
                </View>
                {/* Per-balance progress bars */}
                {(member.balances ?? []).slice(0, 3).map((bal, idx) => {
                  const barColor = BALANCE_COLORS[idx % BALANCE_COLORS.length];
                  const pct = bal.allocated > 0 ? Math.min(bal.remaining / bal.allocated, 1) : 0;
                  return (
                    <View key={bal.leave_type_id} style={styles.balRow}>
                      <View style={styles.balRowHeader}>
                        <Text style={[styles.balTypeName, {color: theme.text}]}>
                          {isAr ? bal.leave_type_name_ar : bal.leave_type_name}
                        </Text>
                        <Text style={[styles.balRatio, {color: theme.textSecondary}]}>
                          {bal.remaining} / {bal.allocated} {t('leave.days')}
                        </Text>
                      </View>
                      <View style={[styles.barTrack, {backgroundColor: theme.border}]}>
                        <View
                          style={[
                            styles.barFill,
                            {width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor},
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},

  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  statItem: {alignItems: 'center', gap: 4},
  statCount: {fontSize: 24, fontWeight: '700'},
  statLabel: {fontSize: fontSize.xs},

  toggleRow: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleText: {fontSize: fontSize.sm, fontWeight: '600'},

  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.xs},

  // Status view
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {color: colors.white, fontSize: fontSize.sm, fontWeight: '700'},
  memberInfo: {flex: 1, gap: 2},
  memberName: {fontSize: fontSize.sm, fontWeight: '600'},
  memberSub: {fontSize: fontSize.xs},
  badge: {paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.round},
  badgeText: {fontSize: fontSize.xs, fontWeight: '600'},

  // Balance view
  balanceCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  balanceMemberRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  balRow: {gap: 4},
  balRowHeader: {flexDirection: 'row', justifyContent: 'space-between'},
  balTypeName: {fontSize: fontSize.sm, fontWeight: '500'},
  balRatio: {fontSize: fontSize.xs},
  barTrack: {height: 6, borderRadius: 3, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3},
});
