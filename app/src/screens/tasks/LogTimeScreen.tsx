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
  const {taskId, taskName} = route.params;

  const [date, setDate] = useState(getTodayString());
  const [hoursNum, setHoursNum] = useState<number>(1.0);
  const [description, setDescription] = useState('');

  const {data: tasks} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return isApiSuccess(res.data) ? (res.data.data as Task[]) : [];
    },
  });
  const currentTask = tasks?.find(tk => tk.id === taskId);
  const taskTotal = currentTask?.total_hours_logged ?? 0;
  const newTaskTotal = parseFloat((taskTotal + hoursNum).toFixed(2));

  function stepHours(delta: number) {
    setHoursNum(prev => {
      const next = parseFloat((prev + delta).toFixed(2));
      return Math.max(0.25, next);
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/timesheets', {
        task_id: taskId,
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
    mutation.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('tasks.logTime')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <Card style={styles.taskCard}>
          <Text style={[styles.taskLabel, {color: theme.textSecondary}]}>{t('tasks.task')}</Text>
          <Text style={[styles.taskName, {color: theme.text}]}>{taskName}</Text>
        </Card>

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
              <Text style={styles.summaryLabel}>{t('tasks.hours')}</Text>
              <Text style={[styles.summaryValue, {color: '#fde68a'}]}>+{hoursNum.toFixed(2)}h</Text>
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
