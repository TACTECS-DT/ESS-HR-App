import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import AccessDenied from '../../components/common/AccessDenied';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {EmployeeListItem} from '../../api/mocks/profile.mock';
import {API_MAP} from '../../api/apiMap';

export default function AttendanceManualEntryScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {canManualEditAttendance} = useRBAC();
  const isAr = i18n.language === 'ar';

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const {data: employees} = useQuery({
    queryKey: ['employees'],
    enabled: canManualEditAttendance,
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.employee.directory);
      return isApiSuccess(res.data) ? (res.data.data as EmployeeListItem[]) : [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API_MAP.attendance.manual, {
        employee_id: selectedEmployee?.id,
        date,
        check_in: checkIn,
        check_out: checkOut || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['attendance-summary']});
      Alert.alert(t('common.done'), t('attendance.manualEntrySuccess', 'Attendance record saved.'));
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSelectEmployee() {
    if (!employees?.length) {return;}
    Alert.alert(
      t('attendance.employeeLabel', 'Employee'),
      '',
      [
        ...employees.map(emp => ({
          text: isAr ? emp.name_ar : emp.name,
          onPress: () => setSelectedEmployee(emp),
        })),
        {text: t('common.cancel'), style: 'cancel' as const},
      ],
    );
  }

  function handleSubmit() {
    if (!selectedEmployee) {
      Alert.alert(t('common.error'), t('attendance.selectEmployee', 'Please select an employee.'));
      return;
    }
    if (!date || !checkIn) {
      Alert.alert(t('common.error'), t('attendance.fillRequired', 'Date and check-in time are required.'));
      return;
    }
    submitMutation.mutate();
  }

  if (!canManualEditAttendance) {
    return <AccessDenied />;
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('attendance.manualEntry', 'Manual Entry')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('attendance.employeeLabel', 'Employee')}
        </Text>
        <TouchableOpacity
          style={[styles.selector, {borderColor: theme.border, backgroundColor: theme.surface}]}
          onPress={handleSelectEmployee}>
          <Text style={[styles.selectorText, {color: selectedEmployee ? theme.text : theme.textSecondary}]}>
            {selectedEmployee
              ? (isAr ? selectedEmployee.name_ar : selectedEmployee.name)
              : `-- ${t('attendance.selectEmployee', 'Select Employee')} --`}
          </Text>
          <Text style={{color: theme.textSecondary}}>▾</Text>
        </TouchableOpacity>

        {/* Date */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('attendance.dateLabel', 'Date')} {'(YYYY-MM-DD)'}
        </Text>
        <TextInput
          style={[styles.input, {borderColor: theme.border, color: theme.text, backgroundColor: theme.surface}]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        {/* Check-in */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('attendance.checkInTime', 'Check-in Time')} {'(HH:MM)'}
        </Text>
        <TextInput
          style={[styles.input, {borderColor: theme.border, color: theme.text, backgroundColor: theme.surface}]}
          value={checkIn}
          onChangeText={setCheckIn}
          placeholder="09:00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        {/* Check-out (optional) */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('attendance.checkOutTime', 'Check-out Time')} {'(HH:MM) '}{t('common.optional')}
        </Text>
        <TextInput
          style={[styles.input, {borderColor: theme.border, color: theme.text, backgroundColor: theme.surface}]}
          value={checkOut}
          onChangeText={setCheckOut}
          placeholder="17:00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.submitBtn, {backgroundColor: colors.primary}]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}>
          <Text style={styles.submitBtnText}>
            {submitMutation.isPending ? t('common.loading') : t('common.save')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  label: {fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm},
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  selectorText: {flex: 1, fontSize: fontSize.sm},
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
  },
  submitBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnText: {color: '#fff', fontSize: fontSize.md, fontWeight: '700'},
});
