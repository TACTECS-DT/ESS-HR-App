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
import DatePickerField from '../../components/common/DatePickerField';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import SelectField from '../../components/common/SelectField';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LoanRules} from '../../api/mocks/loan.mock';

type TransferMethod = 'bank_transfer' | 'cash' | 'cheque';

const TRANSFER_METHODS: {key: TransferMethod; en: string; ar: string}[] = [
  {key: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي'},
  {key: 'cash', en: 'Cash', ar: 'نقداً'},
  {key: 'cheque', en: 'Cheque', ar: 'شيك'},
];

export default function LoanCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';

  const transferMethodOptions = TRANSFER_METHODS.map(m => ({
    label: isAr ? m.ar : m.en,
    value: m.key,
  }));

  const [loanTitle, setLoanTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transferMethod, setTransferMethod] = useState<TransferMethod>('bank_transfer');
  const [reason, setReason] = useState('');

  // Auto-calculate installment from amount + date range
  function calcInstallment(): string {
    const amt = parseFloat(amount);
    if (!amt || !startDate || !endDate) {return '';}
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {return '';}
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months <= 0) {return '';}
    return (amt / months).toFixed(2);
  }

  const installment = calcInstallment();

  const {data: rules, isLoading} = useQuery({
    queryKey: ['loan-rules'],
    queryFn: async () => {
      const res = await apiClient.get('/loans/rules');
      return isApiSuccess(res.data) ? (res.data.data as LoanRules) : null;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/loans', {
        title: loanTitle,
        amount: parseFloat(amount),
        payment_start: startDate,
        payment_end: endDate,
        transfer_method: transferMethod,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['loans']});
      Alert.alert(t('common.done'), t('loan.apply') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit() {
    if (!loanTitle.trim() || !amount || !startDate || !endDate) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid amount');
      return;
    }
    if (rules && parsedAmount > rules.max_amount) {
      Alert.alert(t('common.error'), `${t('loan.maxAmount')}: ${rules.max_amount.toLocaleString()}`);
      return;
    }
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('loan.apply')} showBack />
        <View style={styles.skeletons}>
          <LoadingSkeleton height={60} style={styles.skeleton} />
          <LoadingSkeleton height={60} style={styles.skeleton} />
          <LoadingSkeleton height={60} style={styles.skeleton} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('loan.apply')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Warning / rules card */}
        {rules ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ {t('loan.maxAmount')}: {rules.max_amount.toLocaleString()} SAR {'|'} {t('loan.maxDuration')}: {rules.max_duration_months} {t('loan.months')}
            </Text>
            {rules.eligible ? (
              <Text style={[styles.eligibleText, {color: colors.success}]}>✓ {t('loan.eligible')}</Text>
            ) : (
              <Text style={[styles.eligibleText, {color: colors.error}]}>
                ✗ {isAr ? rules.ineligibility_reason_ar : rules.ineligibility_reason ?? t('loan.notEligible')}
              </Text>
            )}
          </View>
        ) : null}

        <TextInput
          label={`${t('loan.loanTitle')} *`}
          placeholder={isAr ? 'مثال: قرض شخصي' : 'e.g., Personal Loan'}
          value={loanTitle}
          onChangeText={setLoanTitle}
        />

        <TextInput
          label={`${t('loan.amount')} *`}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <TextInput
          label={t('loan.installmentAmount')}
          placeholder={isAr ? 'يحسب تلقائياً' : 'Auto-calculated'}
          value={installment}
          onChangeText={() => {}}
          editable={false}
        />

        <DatePickerField
          label={`${t('loan.paymentStart')} *`}
          value={startDate}
          onChange={setStartDate}
        />

        <DatePickerField
          label={`${t('loan.paymentEnd')} *`}
          value={endDate}
          onChange={setEndDate}
          minimumDate={startDate ? new Date(startDate) : undefined}
        />

        {/* Transfer method */}
        <SelectField
          label={`${t('loan.transferMethod')} *`}
          options={transferMethodOptions}
          value={transferMethod}
          onChange={v => setTransferMethod(v as TransferMethod)}
        />

        <TextInput
          label={`${t('loan.reason')} *`}
          placeholder={isAr ? 'اشرح سبب طلب القرض...' : 'Explain loan reason...'}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* Approval chain */}
        <View style={styles.approvalCard}>
          <Text style={[styles.approvalTitle, {color: theme.text}]}>{t('loan.approvalChain')}</Text>
          {['Manager', 'HR', 'CEO'].map((step, idx) => (
            <Text key={step} style={[styles.approvalStep, {color: theme.textSecondary}]}>
              {idx + 1}. {step}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, {backgroundColor: colors.primary}, mutation.isPending && {opacity: 0.6}]}
          onPress={handleSubmit}
          disabled={mutation.isPending}>
          <Text style={styles.submitBtnText}>{t('leave.submitRequest')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  warningCard: {
    backgroundColor: '#fef7e0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  warningText: {fontSize: fontSize.xs, color: '#b06000'},
  eligibleText: {fontSize: fontSize.xs, fontWeight: '600'},

  approvalCard: {
    backgroundColor: '#e6f4ea',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  approvalTitle: {fontSize: fontSize.sm, fontWeight: '700', marginBottom: 4},
  approvalStep: {fontSize: fontSize.xs},

  submitBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnText: {color: colors.white, fontSize: fontSize.sm, fontWeight: '700'},
});
