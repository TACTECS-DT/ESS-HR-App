import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TeamHoursSummary, TeamMemberHours} from '../../api/mocks/team-hours.mock';

function ProgressBar({percent, color}: {percent: number; color: string}) {
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, {width: `${Math.min(percent, 100)}%`, backgroundColor: color}]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden', flex: 1},
  fill: {height: '100%', borderRadius: 3},
});

function MemberRow({member, theme}: {member: TeamMemberHours; theme: any}) {
  const {t, i18n} = useTranslation();
  const isAr = i18n.language === 'ar';
  const isAboveTarget = member.hours >= member.target_hours;
  const barColor = isAboveTarget ? colors.success : member.percent >= 80 ? colors.warning : colors.error;

  return (
    <View style={[memberStyles.row, {borderBottomColor: theme.border}]}>
      <View style={[memberStyles.avatar, {backgroundColor: colors.primary + '20'}]}>
        <Text style={[memberStyles.initials, {color: colors.primary}]}>{member.initials}</Text>
      </View>
      <View style={memberStyles.info}>
        <View style={memberStyles.nameRow}>
          <Text style={[memberStyles.name, {color: theme.text}]}>{member.name}</Text>
          <Text style={[memberStyles.hours, {color: isAboveTarget ? colors.success : colors.warning}]}>
            {member.hours}h
          </Text>
        </View>
        <Text style={[memberStyles.jobTitle, {color: theme.textSecondary}]}>
          {isAr ? member.job_title_ar : member.job_title}
        </Text>
        <View style={memberStyles.progressRow}>
          <ProgressBar percent={member.percent} color={barColor} />
          <Text style={[memberStyles.percent, {color: barColor}]}>
            {t('teamHours.percentTarget', {percent: member.percent})}
          </Text>
        </View>
      </View>
    </View>
  );
}

const memberStyles = StyleSheet.create({
  row: {flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth},
  avatar: {width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center'},
  initials: {fontSize: fontSize.sm, fontWeight: '700'},
  info: {flex: 1, gap: 3},
  nameRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  name: {fontSize: fontSize.sm, fontWeight: '600', flex: 1},
  hours: {fontSize: fontSize.md, fontWeight: '700'},
  jobTitle: {fontSize: fontSize.xs},
  progressRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2},
  percent: {fontSize: fontSize.xs, fontWeight: '600', minWidth: 60, textAlign: 'right'},
});

export default function TeamHoursScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);

  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['team-hours'],
    queryFn: async () => {
      const res = await apiClient.get('/team-hours');
      return isApiSuccess(res.data) ? (res.data.data as TeamHoursSummary) : null;
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('teamHours.title')} showBack />
        <View style={styles.skeletons}>
          <LoadingSkeleton height={100} style={styles.skeleton} />
          {[0, 1, 2, 3, 4].map(i => <LoadingSkeleton key={i} height={70} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('teamHours.title')} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>

        {data ? (
          <>
            {/* Week selector */}
            <View style={[styles.weekSelector, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <TouchableOpacity
                style={styles.weekNavBtn}
                onPress={() => setWeekOffset(prev => prev - 1)}>
                <Text style={[styles.weekNavText, {color: colors.primary}]}>{'◀'}</Text>
              </TouchableOpacity>
              <View style={styles.weekLabelBlock}>
                <Text style={[styles.weekSelectorLabel, {color: theme.text}]}>
                  {data.week_label}
                </Text>
                <Text style={[styles.weekSelectorSub, {color: theme.textSecondary}]}>
                  {t('teamHours.week', {n: data.week_number + weekOffset})}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.weekNavBtn, weekOffset >= 0 && styles.weekNavDisabled]}
                onPress={() => setWeekOffset(prev => Math.min(0, prev + 1))}
                disabled={weekOffset >= 0}>
                <Text style={[styles.weekNavText, {color: weekOffset >= 0 ? theme.textSecondary : colors.primary}]}>{'▶'}</Text>
              </TouchableOpacity>
            </View>

            {/* Summary card */}
            <View style={[styles.summaryCard, {backgroundColor: colors.primary}]}>
              <Text style={styles.weekLabel}>
                {t('teamHours.week', {n: data.week_number + weekOffset})} — {data.week_label}
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{data.total_hours}h</Text>
                  <Text style={styles.summaryLabel}>{t('teamHours.weekTotal')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{data.avg_per_person}h</Text>
                  <Text style={styles.summaryLabel}>{t('teamHours.perPerson')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: '#fca5a5'}]}>{data.below_target_count}</Text>
                  <Text style={styles.summaryLabel}>{t('teamHours.belowTarget')}</Text>
                </View>
              </View>
            </View>

            {/* Members list */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('teamHours.members')}</Text>
            <View style={[styles.membersCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {data.members.map(member => (
                <MemberRow key={member.id} member={member} theme={theme} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  summaryCard: {borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md},
  weekLabel: {color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, textAlign: 'center'},
  summaryStats: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {alignItems: 'center', flex: 1},
  summaryValue: {color: '#fff', fontSize: fontSize.xxl, fontWeight: '700'},
  summaryLabel: {color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, textAlign: 'center', marginTop: 2},
  summaryDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.3)'},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  membersCard: {borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md},
  weekSelector: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  weekNavBtn: {padding: spacing.sm},
  weekNavDisabled: {opacity: 0.35},
  weekNavText: {fontSize: fontSize.lg, fontWeight: '700'},
  weekLabelBlock: {flex: 1, alignItems: 'center', gap: 2},
  weekSelectorLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  weekSelectorSub: {fontSize: fontSize.xs},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
