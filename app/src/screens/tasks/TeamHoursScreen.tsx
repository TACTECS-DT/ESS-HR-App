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
import {useRBAC} from '../../hooks/useRBAC';
import AccessDenied from '../../components/common/AccessDenied';
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
  track: {height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden', marginTop: spacing.xs},
  fill: {height: '100%', borderRadius: 3},
});

function MemberCard({member, theme}: {member: TeamMemberHours; theme: any}) {
  const {t, i18n} = useTranslation();
  const isAr = i18n.language === 'ar';
  const isAboveTarget = member.hours >= member.target_hours;
  const barColor = isAboveTarget ? colors.success : member.percent >= 80 ? colors.warning : colors.error;
  const hoursColor = isAboveTarget ? colors.success : member.percent >= 80 ? colors.warning : colors.error;

  return (
    <View style={[cardStyles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
      <View style={cardStyles.row}>
        <View style={[cardStyles.avatar, {backgroundColor: colors.primary + '20'}]}>
          <Text style={[cardStyles.initials, {color: colors.primary}]}>{member.initials}</Text>
        </View>
        <View style={cardStyles.info}>
          <View style={cardStyles.nameRow}>
            <Text style={[cardStyles.name, {color: theme.text}]}>{member.name}</Text>
            <View style={cardStyles.hoursBlock}>
              <Text style={[cardStyles.hours, {color: hoursColor}]}>{member.hours}h</Text>
              <Text style={[cardStyles.percent, {color: barColor}]}>
                {t('teamHours.percentTarget', {percent: member.percent})}
              </Text>
            </View>
          </View>
          <Text style={[cardStyles.jobTitle, {color: theme.textSecondary}]}>
            {isAr ? member.job_title_ar : member.job_title}
          </Text>
          <ProgressBar percent={member.percent} color={barColor} />
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md},
  row: {flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start'},
  avatar: {width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', flexShrink: 0},
  initials: {fontSize: fontSize.sm, fontWeight: '700'},
  info: {flex: 1},
  nameRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  name: {fontSize: fontSize.sm, fontWeight: '600', flex: 1},
  hoursBlock: {alignItems: 'flex-end'},
  hours: {fontSize: fontSize.lg, fontWeight: '700'},
  percent: {fontSize: fontSize.xs, fontWeight: '600'},
  jobTitle: {fontSize: fontSize.xs, marginTop: 2},
});

export default function TeamHoursScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);
  const {canAccessTeamHours} = useRBAC();

  // Hook must be called unconditionally — disabled when no access
  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['team-hours'],
    enabled: canAccessTeamHours,
    queryFn: async () => {
      const res = await apiClient.get('/team-hours');
      return isApiSuccess(res.data) ? (res.data.data as TeamHoursSummary) : null;
    },
  });

  if (!canAccessTeamHours) {
    return <AccessDenied />;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('teamHours.title')} showBack rightIcon="📊" />
        <View style={styles.skeletons}>
          <LoadingSkeleton height={100} style={styles.skeleton} />
          {[0, 1, 2, 3, 4].map(i => <LoadingSkeleton key={i} height={80} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('teamHours.title')} showBack rightIcon="📊" />
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

            {/* Summary card — light blue background, dark text */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: colors.primary}]}>{data.total_hours}h</Text>
                  <Text style={[styles.summaryLabel, {color: '#5f6368'}]}>{t('teamHours.weekTotal')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: colors.success}]}>{data.avg_per_person}h</Text>
                  <Text style={[styles.summaryLabel, {color: '#5f6368'}]}>{t('teamHours.perPerson')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, {color: colors.error}]}>{data.below_target_count}</Text>
                  <Text style={[styles.summaryLabel, {color: '#5f6368'}]}>{t('teamHours.belowTarget')}</Text>
                </View>
              </View>
            </View>

            {/* Members — each in its own card */}
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('teamHours.members')}
              {' ('}
              {data.members.length}
              {')'}
            </Text>
            {data.members.map(member => (
              <MemberCard key={member.id} member={member} theme={theme} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  summaryCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: '#e8f0fe',
  },
  summaryStats: {flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'},
  summaryItem: {alignItems: 'center', flex: 1},
  summaryValue: {fontSize: fontSize.xxl, fontWeight: '700'},
  summaryLabel: {fontSize: fontSize.xs, textAlign: 'center', marginTop: 2},
  summaryDivider: {width: 1, height: 40, backgroundColor: '#c5d4f6'},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.xs},
  weekSelector: {
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
