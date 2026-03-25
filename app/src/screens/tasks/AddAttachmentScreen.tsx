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
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<MoreStackParamList, 'AddAttachment'>;

const UPLOAD_OPTIONS = [
  {key: 'camera', icon: '📷'},
  {key: 'gallery', icon: '🖼️'},
  {key: 'files', icon: '📁'},
] as const;

export default function AddAttachmentScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();

  const paramTaskId = route.params?.taskId ?? 0;
  const paramTaskName = route.params?.taskName ?? '';
  const isStandalone = !paramTaskId;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.tasks.list);
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  const resolvedTaskId = isStandalone ? (selectedTask?.id ?? 0) : paramTaskId;
  const resolvedTaskName = isStandalone ? (selectedTask?.name ?? '') : paramTaskName;
  const resolvedProject = isStandalone ? (selectedTask?.project ?? '') : '';

  const currentTask = (tasks ?? []).find(tk => tk.id === resolvedTaskId);
  const existingAttachments = currentTask?.attachments ?? [];

  const fakeFileName = selectedOption
    ? `attachment_${resolvedTaskId}.${selectedOption === 'files' ? 'pdf' : 'jpg'}`
    : '';

  const uploadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API_MAP.tasks.attachments(resolvedTaskId), {
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
    if (isStandalone && !selectedTask) {
      Alert.alert(t('common.error'), t('tasks.task'));
      return;
    }
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

        {isStandalone ? (
          /* Task picker for standalone mode */
          <View style={[styles.pickerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            <Text style={[styles.pickerLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
            <TouchableOpacity
              style={[styles.pickerRow, {borderColor: theme.border}]}
              onPress={() => setShowTaskPicker(p => !p)}>
              <Text style={[styles.pickerValue, {color: selectedTask ? theme.text : theme.textSecondary}]}>
                {selectedTask ? selectedTask.name : '— ' + t('tasks.task') + ' —'}
              </Text>
              <Text style={[styles.pickerArrow, {color: theme.textSecondary}]}>
                {showTaskPicker ? '▴' : '▾'}
              </Text>
            </TouchableOpacity>
            {showTaskPicker && (
              <View style={[styles.dropdownList, {borderColor: theme.border, backgroundColor: theme.surface}]}>
                {(tasks ?? []).map(tk => (
                  <TouchableOpacity
                    key={tk.id}
                    style={[styles.dropdownItem, {borderBottomColor: theme.border}, selectedTask?.id === tk.id && {backgroundColor: colors.primary + '12'}]}
                    onPress={() => {
                      setSelectedTask(tk);
                      setShowTaskPicker(false);
                    }}>
                    <Text style={[styles.dropdownItemText, {color: selectedTask?.id === tk.id ? colors.primary : theme.text}]}>
                      {tk.name}
                    </Text>
                    <Text style={[styles.dropdownItemSub, {color: theme.textSecondary}]}>
                      {'📁 '}{tk.project}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Pre-selected task info */
          <View style={[styles.taskCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            <Text style={[styles.taskLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
            <Text style={[styles.taskName, {color: theme.text}]}>{resolvedTaskName}</Text>
            {resolvedProject ? (
              <Text style={[styles.taskProject, {color: theme.textSecondary}]}>{'📁 '}{resolvedProject}</Text>
            ) : null}
          </View>
        )}

        {/* Large upload area */}
        <TouchableOpacity
          style={[
            styles.uploadArea,
            {
              borderColor: selectedOption ? colors.primary : theme.border,
              backgroundColor: selectedOption ? colors.primary + '08' : theme.surface,
            },
            (isStandalone && !selectedTask) && styles.uploadAreaDisabled,
          ]}
          onPress={() => {
            if (isStandalone && !selectedTask) {return;}
            setSelectedOption(prev => prev ?? 'files');
          }}
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
            const isDisabled = isStandalone && !selectedTask;
            return (
              <TouchableOpacity
                key={opt.key}
                disabled={isDisabled}
                style={[
                  styles.optionCard,
                  {backgroundColor: theme.surface, borderColor: isSelected ? colors.primary : theme.border},
                  isSelected && {backgroundColor: colors.primary + '10'},
                  isDisabled && {opacity: 0.45},
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
              <Text style={{color: theme.textSecondary, fontSize: fontSize.lg}}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Button
          label={'📤  ' + t('tasks.uploadAttachment')}
          onPress={handleUpload}
          loading={uploadMutation.isPending}
          fullWidth
          disabled={!selectedOption || (isStandalone && !selectedTask)}
        />

        {/* Existing attachments */}
        {existingAttachments.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('tasks.currentAttachments')}
              {' ('}
              {existingAttachments.length}
              {')'}
            </Text>
            <View style={[styles.attachmentsCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {existingAttachments.map((att, idx) => (
                <View key={idx} style={[styles.attRow, {borderBottomColor: theme.border}]}>
                  <View style={[styles.attIcon, {backgroundColor: '#e8f0fe'}]}>
                    <Text style={{fontSize: 18}}>📄</Text>
                  </View>
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
  pickerCard: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  pickerLabel: {fontSize: fontSize.xs, fontWeight: '600'},
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pickerValue: {fontSize: fontSize.sm, flex: 1},
  pickerArrow: {fontSize: fontSize.sm},
  dropdownList: {borderWidth: 1, borderRadius: radius.sm, marginTop: spacing.xs, overflow: 'hidden'},
  dropdownItem: {padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2},
  dropdownItemText: {fontSize: fontSize.sm, fontWeight: '500'},
  dropdownItemSub: {fontSize: fontSize.xs},
  taskCard: {borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  taskLabel: {fontSize: fontSize.xs},
  taskName: {fontSize: fontSize.md, fontWeight: '700'},
  taskProject: {fontSize: fontSize.sm},
  uploadArea: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadAreaDisabled: {opacity: 0.45},
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
  attIcon: {width: 40, height: 40, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center'},
  attName: {fontSize: fontSize.sm},
});
