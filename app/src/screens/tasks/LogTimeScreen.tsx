import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import DatePickerField from '../../components/common/DatePickerField';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';
import type {Task} from '../../api/mocks/tasks.mock';
import type {DailyTimesheetSummary} from '../../api/mocks/timesheets.mock';

type Route = RouteProp<TasksStackParamList, 'LogTime'>;

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LogTimeScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();

  const paramTaskId = route.params?.taskId ?? 0;
  const paramTaskName = route.params?.taskName ?? '';
  const isStandalone = !paramTaskId;

  const [date, setDate] = useState(getTodayString());
  const [hoursNum, setHoursNum] = useState<number>(1.0);
  const [description, setDescription] = useState('');

  // Standalone mode state
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });

  // Derive unique project names
  const projects = [...new Set((tasks ?? []).map(tk => tk.project))];
  const tasksForProject = (tasks ?? []).filter(tk => tk.project === selectedProject);

  const resolvedTaskId = isStandalone ? (selectedTask?.id ?? 0) : paramTaskId;
  const resolvedTaskName = isStandalone ? (selectedTask?.name ?? '') : paramTaskName;

  const currentTask = (tasks ?? []).find(tk => tk.id === resolvedTaskId);
  const taskTotal = currentTask?.total_hours_logged ?? 0;
  const newTaskTotal = parseFloat((taskTotal + hoursNum).toFixed(2));

  const {data: timesheets} = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const res = await apiClient.get('/timesheets');
      return isApiSuccess(res.data) ? (res.data.data as DailyTimesheetSummary[]) : [];
    },
  });

  const todayExistingHours = (timesheets ?? [])
    .filter(day => day.date === date)
    .reduce((sum, day) => sum + day.total_hours, 0);
  const todayNewTotal = parseFloat((todayExistingHours + hoursNum).toFixed(2));

  function stepHours(delta: number) {
    setHoursNum(prev => {
      const next = parseFloat((prev + delta).toFixed(2));
      return Math.max(0.25, next);
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/timesheets', {
        task_id: resolvedTaskId,
        date,
        hours: hoursNum,
        description,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['timesheets']});
      queryClient.invalidateQueries({queryKey: ['tasks']});
      Alert.alert(t('common.done'), t('tasks.timeLogged') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit() {
    if (!date) {
      Alert.alert(t('common.error'), 'Please select a date');
      return;
    }
    if (isStandalone && !selectedTask) {
      Alert.alert(t('common.error'), t('tasks.task'));
      return;
    }
    mutation.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('tasks.logTime')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {isStandalone ? (
          <>
            {/* Project picker */}
            <View style={[styles.pickerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.pickerLabel, {color: theme.textSecondary}]}>{t('tasks.project')}</Text>
              <TouchableOpacity
                style={[styles.pickerRow, {borderColor: theme.border}]}
                onPress={() => {setShowProjectPicker(p => !p); setShowTaskPicker(false);}}>
                <Text style={[styles.pickerValue, {color: selectedProject ? theme.text : theme.textSecondary}]}>
                  {selectedProject || '— ' + t('tasks.project') + ' —'}
                </Text>
                <Text style={[styles.pickerArrow, {color: theme.textSecondary}]}>
                  {showProjectPicker ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              {showProjectPicker && (
                <View style={[styles.dropdownList, {borderColor: theme.border, backgroundColor: theme.surface}]}>
                  {projects.map(proj => (
                    <TouchableOpacity
                      key={proj}
                      style={[styles.dropdownItem, {borderBottomColor: theme.border}, selectedProject === proj && {backgroundColor: colors.primary + '12'}]}
                      onPress={() => {
                        setSelectedProject(proj);
                        setSelectedTask(null);
                        setShowProjectPicker(false);
                      }}>
                      <Text style={[styles.dropdownItemText, {color: selectedProject === proj ? colors.primary : theme.text}]}>
                        {proj}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Task picker */}
            <View style={[styles.pickerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              <Text style={[styles.pickerLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
              <TouchableOpacity
                style={[styles.pickerRow, {borderColor: theme.border}, !selectedProject && styles.pickerDisabled]}
                disabled={!selectedProject}
                onPress={() => {setShowTaskPicker(p => !p); setShowProjectPicker(false);}}>
                <Text style={[styles.pickerValue, {color: selectedTask ? theme.text : theme.textSecondary}]}>
                  {selectedTask ? selectedTask.name : '— ' + t('tasks.task') + ' —'}
                </Text>
                <Text style={[styles.pickerArrow, {color: theme.textSecondary}]}>
                  {showTaskPicker ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              {showTaskPicker && (
                <View style={[styles.dropdownList, {borderColor: theme.border, backgroundColor: theme.surface}]}>
                  {tasksForProject.map(tk => (
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
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          /* Pre-selected task card (from task detail) */
          <Card style={styles.taskCard}>
            <Text style={[styles.taskLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
            <Text style={[styles.taskName, {color: theme.text}]}>{resolvedTaskName}</Text>
          </Card>
        )}

        <DatePickerField
          label={`${t('common.date')} *`}
          value={date}
          onChange={setDate}
        />

        {/* Hours stepper */}
        <View style={[styles.stepperContainer, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.stepperLabel, {color: theme.textSecondary}]}>{t('tasks.hours')} *</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, {backgroundColor: theme.background, borderColor: theme.border}]}
              onPress={() => stepHours(-0.25)}>
              <Text style={[styles.stepperBtnText, {color: theme.text}]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, {color: theme.text}]}>{hoursNum.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, {backgroundColor: theme.background, borderColor: theme.border}]}
              onPress={() => stepHours(0.25)}>
              <Text style={[styles.stepperBtnText, {color: theme.text}]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.stepperHint, {color: theme.textSecondary}]}>{t('tasks.hoursHint')}</Text>
        </View>

        <TextInput
          label={t('tasks.description')}
          placeholder="..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={[styles.summaryCard, {backgroundColor: colors.primary}]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('tasks.taskTotal')}</Text>
              <Text style={styles.summaryValue}>{newTaskTotal}h</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('tasks.todayTotal')}</Text>
              <Text style={[styles.summaryValue, {color: '#fde68a'}]}>{todayNewTotal}h</Text>
            </View>
          </View>
        </View>

        <Button
          label={'💾  ' + t('common.submit')}
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
        />
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={() => navigation.goBack()}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  taskCard: {gap: spacing.xs},
  taskLabel: {fontSize: fontSize.xs},
  taskName: {fontSize: fontSize.md, fontWeight: '700'},
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
  pickerDisabled: {opacity: 0.45},
  pickerValue: {fontSize: fontSize.sm, flex: 1},
  pickerArrow: {fontSize: fontSize.sm},
  dropdownList: {borderWidth: 1, borderRadius: radius.sm, marginTop: spacing.xs, overflow: 'hidden'},
  dropdownItem: {
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemText: {fontSize: fontSize.sm},
  stepperContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepperLabel: {fontSize: fontSize.sm, fontWeight: '600'},
  stepperRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md},
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {fontSize: fontSize.xl, fontWeight: '700'},
  stepperValue: {fontSize: 36, fontWeight: '700', minWidth: 100, textAlign: 'center', fontVariant: ['tabular-nums']},
  stepperHint: {fontSize: fontSize.xs, textAlign: 'center'},
  summaryCard: {borderRadius: radius.lg, padding: spacing.md},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {flex: 1, alignItems: 'center', gap: 4},
  summaryLabel: {color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs},
  summaryValue: {color: '#fff', fontSize: fontSize.xxl, fontWeight: '700'},
  summaryDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.3)'},
});
