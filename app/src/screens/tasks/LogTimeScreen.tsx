import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize} from '../../config/theme';
import type {TasksStackParamList} from '../../navigation/types';

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
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/timesheets', {
        task_id: taskId,
        date,
        hours: parseFloat(hours),
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
    if (!date || !hours) {
      Alert.alert(t('common.error'), 'Please fill date and hours');
      return;
    }
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      Alert.alert(t('common.error'), 'Please enter valid hours');
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

        <TextInput
          label={`${t('common.date')} *`}
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />

        <TextInput
          label={`${t('tasks.hours')} *`}
          placeholder="0.5"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />

        <TextInput
          label={t('tasks.description')}
          placeholder="..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Button
          label={t('common.submit')}
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {padding: spacing.md, gap: spacing.sm},
  taskCard: {gap: spacing.xs},
  taskLabel: {fontSize: fontSize.xs},
  taskName: {fontSize: fontSize.md, fontWeight: '700'},
});
