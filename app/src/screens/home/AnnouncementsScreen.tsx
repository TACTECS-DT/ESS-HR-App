import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {Announcement, AnnouncementPriority} from '../../api/mocks/announcements.mock';

const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  urgent: colors.error,
  info: colors.primary,
  general: colors.success,
};

function priorityLabel(p: AnnouncementPriority, isAr: boolean): string {
  if (p === 'urgent') {return isAr ? 'عاجل' : 'URGENT';}
  if (p === 'info') {return isAr ? 'معلومة' : 'INFO';}
  return isAr ? 'عام' : 'GENERAL';
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AnnouncementsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';

  const {data, isLoading} = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/announcements');
      return isApiSuccess(res.data) ? (res.data.data as Announcement[]) : [];
    },
  });

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('announcements.title')} showBack />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map(i => (
            <LoadingSkeleton key={i} width="100%" height={100} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('announcements.empty')} />}
          renderItem={({item}) => {
            const pColor = PRIORITY_COLORS[item.priority ?? 'general'];
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                {/* Colored left border accent */}
                <View style={[styles.leftBorder, {backgroundColor: pColor}]} />

                <View style={styles.cardBody}>
                  {/* Priority label */}
                  <Text style={[styles.priorityLabel, {color: pColor}]}>
                    {priorityLabel(item.priority ?? 'general', isAr)}
                  </Text>

                  {/* Title */}
                  <Text style={[styles.title, {color: theme.text}]}>
                    {isAr ? item.title_ar : item.title}
                  </Text>

                  {/* Body */}
                  <Text style={[styles.body, {color: theme.textSecondary}]} numberOfLines={2}>
                    {isAr ? item.body_ar : item.body}
                  </Text>

                  {/* Footer */}
                  <Text style={[styles.footer, {color: theme.textSecondary}]}>
                    {'📅 '}{formatDate(item.date, i18n.language)}{' | '}{isAr ? item.posted_by_ar : item.posted_by}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  skeletonWrap: {padding: spacing.md, gap: spacing.sm},
  list: {padding: spacing.md, gap: spacing.sm},

  card: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    fontSize: 11,
    marginTop: 2,
  },
});
