import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import TextInput from '../../components/common/TextInput';
import StatusChip from '../../components/common/StatusChip';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AdvanceSalary} from '../../api/mocks/advance-salary.mock';

interface AdvanceSalaryInfo {
  basic_salary: number;
  max_advance: number;
}

export default function AdvanceSalaryCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const {data: info, isLoading: infoLoading} = useQuery({
    queryKey: ['advance-salary-info'],
    queryFn: async () => {
      const res = await apiClient.get('/advance-salary/info');
      return isApiSuccess(res.data) ? (res.data.data as AdvanceSalaryInfo) : null;
    },
  });

  const {data: recentList, isLoading: listLoading} = useQuery({
    queryKey: ['advance-salary'],
    queryFn: async () => {
      const res = await apiClient.get('/advance-salary');
      return isApiSuccess(res.data) ? (res.data.data as AdvanceSalary[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/advance-salary', {
        title,
        amount: parseFloat(amount),
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['advance-salary']});
      Alert.alert(t('common.done'), t('advanceSalary.request') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (!amount) {
      Alert.alert(t('common.error'), 'Please enter an amount');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid amount');
      return;
    }
    if (info && parsedAmount > info.max_advance) {
      Alert.alert(
        t('common.error'),
        `${t('advanceSalary.maxAdvance')}: ${info.max_advance.toLocaleString()} SAR`,
      );
      return;
    }
    mutation.mutate();
  }

  function handleSaveDraft() {
    Alert.alert(t('common.done'), t('advanceSalary.saveDraft') + ' ✓');
    navigation.goBack();
  }

  if (infoLoading || listLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('advanceSalary.request')} showBack />
        <View style={styles.skeletons}>
          <LoadingSkeleton height={60} style={styles.skeleton} />
          <LoadingSkeleton height={60} style={styles.skeleton} />
          <LoadingSkeleton height={80} style={styles.skeleton} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('advanceSalary.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Max allowed info card */}
        {info ? (
          <View style={[styles.infoCard, {backgroundColor: colors.primary + '11'}]}>
            <Text style={[styles.infoText, {color: colors.primary}]}>
              {t('advanceSalary.maxAllowed')}: <Text style={{fontWeight: '700'}}>
                {info.max_advance.toLocaleString()} SAR
              </Text> {'(50% ' + t('advanceSalary.basicSalary') + ')'}
            </Text>
          </View>
        ) : null}

        {/* New Request section */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.submitRequest')}</Text>

        <TextInput
          label={`${t('advanceSalary.titleField')} *`}
          placeholder={t('advanceSalary.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          label={`${t('advanceSalary.amount')} * (${t('advanceSalary.maxAllowed')}: ${info?.max_advance.toLocaleString() ?? '—'} SAR)`}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <TextInput
          label={`${t('advanceSalary.reason')} *`}
          placeholder={t('advanceSalary.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnOutline, {borderColor: colors.primary}]}
            onPress={handleSaveDraft}>
            <Text style={[styles.btnOutlineText, {color: colors.primary}]}>
              {t('advanceSalary.saveDraft')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrimary, {backgroundColor: colors.primary}, mutation.isPending && {opacity: 0.6}]}
            onPress={handleSubmit}
            disabled={mutation.isPending}>
            <Text style={styles.btnPrimaryText}>{t('common.submit')}</Text>
          </TouchableOpacity>
        </View>

        {/* Previous requests */}
        {(recentList ?? []).length > 0 ? (
          <>
            <View style={[styles.separator, {borderColor: theme.border}]} />
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('advanceSalary.recentRequests')}</Text>
            {(recentList ?? []).map(item => (
              <View
                key={item.id}
                style={[styles.requestRow, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <View style={{flex: 1, gap: 3}}>
                  <Text style={[styles.requestTitle, {color: theme.text}]}>
                    {isAr ? `سلفة - ${item.request_date}` : `Advance - ${item.request_date}`}
                  </Text>
                  <Text style={[styles.requestSub, {color: theme.textSecondary}]}>
                    {item.request_date} · {item.amount.toLocaleString()} SAR
                  </Text>
                </View>
                <StatusChip status={item.status} label={t(`common.status.${item.status}`)} />
              </View>
            ))}
          </>
        ) : null}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  infoCard: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoText: {fontSize: fontSize.sm},

  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.xs},
  separator: {borderTopWidth: StyleSheet.hairlineWidth, marginVertical: spacing.sm},

  btnRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs},
  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnOutlineText: {fontSize: fontSize.sm, fontWeight: '700'},
  btnPrimary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnPrimaryText: {color: colors.white, fontSize: fontSize.sm, fontWeight: '700'},

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  requestTitle: {fontSize: fontSize.sm, fontWeight: '600'},
  requestSub: {fontSize: fontSize.xs},
});
