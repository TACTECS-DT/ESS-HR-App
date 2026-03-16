import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {MoreStackParamList} from '../../navigation/types';
import type {Task} from '../../api/mocks/tasks.mock';

type Route = RouteProp<MoreStackParamList, 'AddAttachment'>;

const UPLOAD_OPTIONS = [
  {key: 'camera', icon: '📷'},
  {key: 'gallery', icon: '🖼️'},
  {key: 'files', icon: '📄'},
] as const;

export default function AddAttachmentScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const {taskId, taskName} = route.params;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const currentTask = tasks?.find(tk => tk.id === taskId);
  const existingAttachments = currentTask?.attachments ?? [];

  const fakeFileName = selectedOption
    ? `attachment_${taskId}.${selectedOption === 'files' ? 'pdf' : 'jpg'}`
    : '';

  const uploadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tasks/${taskId}/attachments`, {
        file_name: fakeFileName,
        source: selectedOption,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tasks']});
      Alert.alert(t('common.done'), t('tasks.uploadAttachment') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleUpload() {
    if (!selectedOption) {
      Alert.alert(t('common.error'), t('tasks.tapToSelect'));
      return;
    }
    uploadMutation.mutate();
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('tasks.addAttachment')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Task info */}
        <View style={[styles.taskCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.taskLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
          <Text style={[styles.taskName, {color: theme.text}]}>{taskName}</Text>
        </View>

        {/* Large upload area */}
        <TouchableOpacity
          style={[styles.uploadArea, {borderColor: selectedOption ? colors.primary : theme.border, backgroundColor: selectedOption ? colors.primary + '08' : theme.surface}]}
          onPress={() => setSelectedOption(prev => prev ?? 'files')}
          activeOpacity={0.7}>
          <Text style={styles.uploadIcon}>📤</Text>
          <Text style={[styles.uploadText, {color: selectedOption ? colors.primary : theme.text}]}>
            {t('tasks.tapToSelect')}
          </Text>
          <Text style={[styles.uploadSubtext, {color: theme.textSecondary}]}>
            {t('tasks.orDragDrop')}
          </Text>
        </TouchableOpacity>

        {/* Quick option grid */}
        <View style={styles.optionsGrid}>
          {UPLOAD_OPTIONS.map(opt => {
            const isSelected = selectedOption === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionCard,
                  {backgroundColor: theme.surface, borderColor: isSelected ? colors.primary : theme.border},
                  isSelected && {backgroundColor: colors.primary + '10'},
                ]}
                onPress={() => setSelectedOption(opt.key)}>
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text style={[styles.optionLabel, {color: isSelected ? colors.primary : theme.text}]}>
                  {t(`tasks.${opt.key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* File preview */}
        {selectedOption ? (
          <View style={[styles.filePreview, {backgroundColor: colors.primary + '12', borderColor: colors.primary}]}>
            <Text style={styles.fileIcon}>📄</Text>
            <View style={{flex: 1}}>
              <Text style={[styles.fileName, {color: theme.text}]} numberOfLines={1}>{fakeFileName}</Text>
              <Text style={[styles.fileStatus, {color: colors.primary}]}>
                {'✓ '}{t('tasks.readyToUpload')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedOption(null)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={[{color: theme.textSecondary, fontSize: fontSize.lg}]}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Button
          label={'📤  ' + t('tasks.uploadAttachment')}
          onPress={handleUpload}
          loading={uploadMutation.isPending}
          fullWidth
          disabled={!selectedOption}
        />

        {/* Existing attachments */}
        {existingAttachments.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('tasks.currentAttachments')}</Text>
            <View style={[styles.attachmentsCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {existingAttachments.map((att, idx) => (
                <View key={idx} style={[styles.attRow, {borderBottomColor: theme.border}]}>
                  <Text style={{fontSize: 20}}>📎</Text>
                  <View style={{flex: 1}}>
                    <Text style={[styles.attName, {color: theme.text}]} numberOfLines={1}>{att}</Text>
                  </View>
                </View>
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
  taskCard: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  taskLabel: {fontSize: fontSize.xs},
  taskName: {fontSize: fontSize.md, fontWeight: '700'},
  uploadArea: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadIcon: {fontSize: 40},
  uploadText: {fontSize: fontSize.md, fontWeight: '700', textAlign: 'center'},
  uploadSubtext: {fontSize: fontSize.sm, textAlign: 'center'},
  optionsGrid: {flexDirection: 'row', gap: spacing.sm},
  optionCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionIcon: {fontSize: 28},
  optionLabel: {fontSize: fontSize.xs, fontWeight: '600', textAlign: 'center'},
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  fileIcon: {fontSize: 28},
  fileName: {fontSize: fontSize.sm, fontWeight: '600'},
  fileStatus: {fontSize: fontSize.xs, marginTop: 2},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  attachmentsCard: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, gap: spacing.xs},
  attRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attName: {fontSize: fontSize.sm},
});
