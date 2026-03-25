import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {useAppSelector} from '../../hooks/useAppSelector';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {Announcement, AnnouncementPriority} from '../../api/mocks/announcements.mock';
import {API_MAP} from '../../api/apiMap';

const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  urgent: colors.error,
  info: colors.primary,
  general: colors.success,
};

// priorityLabel replaced with t('announcements.priority.*') inline

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const PRIORITIES: AnnouncementPriority[] = ['general', 'info', 'urgent'];

export default function AnnouncementsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const {canCreateAnnouncements} = useRBAC();
  const user = useAppSelector(state => state.auth.user);

  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<AnnouncementPriority>('general');

  const {data, isLoading} = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.announcements.list);
      return isApiSuccess(res.data) ? (res.data.data as Announcement[]) : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API_MAP.announcements.list, {title: newTitle, body: newBody, priority: newPriority});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['announcements']});
      setModalOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewPriority('general');
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleCreate() {
    if (!newTitle.trim() || !newBody.trim()) {
      Alert.alert(t('common.error'), t('announcements.fillRequired', 'Please fill in title and body.'));
      return;
    }
    createMutation.mutate();
  }

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
                    {t(`announcements.priority.${item.priority ?? 'general'}`)}
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

      {/* FAB — hr/admin only */}
      {canCreateAnnouncements ? (
        <TouchableOpacity
          style={[styles.fab, {backgroundColor: colors.primary}]}
          onPress={() => setModalOpen(true)}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      ) : null}

      {/* Create announcement modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: theme.surface}]}>
            <Text style={[styles.modalTitle, {color: theme.text}]}>
              {t('announcements.create', 'New Announcement')}
            </Text>

            {/* Posted by (readonly) */}
            <View style={styles.postedByRow}>
              <Text style={[styles.postedByLabel, {color: theme.textSecondary}]}>
                {t('common.employee')}
              </Text>
              <Text style={[styles.postedByValue, {color: theme.text}]}>
                {isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
              </Text>
            </View>

            <TextInput
              style={[styles.input, {color: theme.text, borderColor: theme.border, backgroundColor: theme.background}]}
              placeholder={t('announcements.titleLabel', 'Title')}
              placeholderTextColor={theme.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline, {color: theme.text, borderColor: theme.border, backgroundColor: theme.background}]}
              placeholder={t('announcements.bodyLabel', 'Body')}
              placeholderTextColor={theme.textSecondary}
              value={newBody}
              onChangeText={setNewBody}
              multiline
              numberOfLines={4}
            />

            {/* Priority selector */}
            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
              {t('announcements.priorityLabel', 'Priority')}
            </Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    {borderColor: PRIORITY_COLORS[p]},
                    newPriority === p && {backgroundColor: PRIORITY_COLORS[p]},
                  ]}
                  onPress={() => setNewPriority(p)}>
                  <Text style={{
                    color: newPriority === p ? '#fff' : PRIORITY_COLORS[p],
                    fontSize: fontSize.xs,
                    fontWeight: '700',
                  }}>
                    {t(`announcements.priority.${p}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, {borderColor: theme.border, borderWidth: 1}]}
                onPress={() => setModalOpen(false)}>
                <Text style={{color: theme.textSecondary, fontWeight: '600'}}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: colors.primary}]}
                onPress={handleCreate}
                disabled={createMutation.isPending}>
                <Text style={{color: '#fff', fontWeight: '700'}}>{t('common.submit', 'Publish')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {color: '#fff', fontSize: 26, lineHeight: 30},

  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalCard: {
    borderTopLeftRadius: radius.xl ?? 20,
    borderTopRightRadius: radius.xl ?? 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs},
  postedByRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
  postedByLabel: {fontSize: fontSize.xs, fontWeight: '600', minWidth: 60},
  postedByValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1},
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
  },
  inputMultiline: {height: 96, textAlignVertical: 'top'},
  fieldLabel: {fontSize: fontSize.xs, fontWeight: '600', marginTop: spacing.xs},
  priorityRow: {flexDirection: 'row', gap: spacing.sm},
  priorityChip: {
    borderWidth: 1.5,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modalActions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  modalBtn: {flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
});
