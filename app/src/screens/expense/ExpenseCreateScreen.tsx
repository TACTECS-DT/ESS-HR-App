import React, {useMemo, useState} from 'react';
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
import SelectField from '../../components/common/SelectField';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {ExpenseCategory} from '../../api/mocks/expense.mock';

type Currency = 'SAR' | 'AED' | 'USD' | 'EUR';
type PaymentMode = 'employee_paid' | 'company_paid';
type TaxOption = 'none' | 'vat15' | 'vat5';

export default function ExpenseCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [date, setDate] = useState('2026-03-15');
  const [quantity, setQuantity] = useState('1');
  const [tax, setTax] = useState<TaxOption>('none');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('employee_paid');
  const [notes, setNotes] = useState('');

  const currencyOptions = useMemo(() =>
    (['SAR', 'AED', 'USD', 'EUR'] as Currency[]).map(c => ({label: c, value: c})),
  []);

  const taxOptions = useMemo(() =>
    (['none', 'vat15', 'vat5'] as TaxOption[]).map(v => ({label: t(`expense.taxOptions.${v}`), value: v})),
  [t]);

  const paymentModeOptions = useMemo(() =>
    (['employee_paid', 'company_paid'] as PaymentMode[]).map(v => ({label: t(`expense.paymentMode.${v}`), value: v})),
  [t]);

  const {data: categories} = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return isApiSuccess(res.data) ? (res.data.data as ExpenseCategory[]) : [];
    },
  });

  const categoryOptions = useMemo(() =>
    (categories ?? []).map(cat => ({label: isAr ? cat.name_ar : cat.name, value: cat.id})),
  [categories, isAr]);

  const mutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await apiClient.post('/expenses', {
        category_id: selectedCategoryId,
        description,
        amount: parseFloat(amount),
        currency,
        date,
        quantity: parseInt(quantity, 10),
        tax,
        payment_mode: paymentMode,
        notes,
        status: isDraft ? 'draft' : 'pending',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['expenses']});
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function validate(): boolean {
    if (!selectedCategoryId || !amount || !description) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
      return false;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid amount');
      return false;
    }
    return true;
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('expense.create')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Description */}
        <TextInput
          label={`${t('expense.description')} *`}
          placeholder={t('expense.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
        />

        {/* Category */}
        <SelectField
          label={`${t('expense.category')} *`}
          options={categoryOptions}
          value={selectedCategoryId}
          onChange={v => setSelectedCategoryId(v as number)}
          placeholder={t('expense.category')}
        />

        {/* Amount + Currency row */}
        <View style={styles.row2}>
          <View style={{flex: 2}}>
            <TextInput
              label={`${t('expense.amount')} *`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{flex: 1}}>
            <SelectField
              label={t('expense.currency')}
              options={currencyOptions}
              value={currency}
              onChange={v => setCurrency(v as Currency)}
            />
          </View>
        </View>

        {/* Date */}
        <DatePickerField
          label={t('expense.date')}
          value={date}
          onChange={setDate}
        />

        {/* Quantity */}
        <TextInput
          label={t('expense.quantity')}
          placeholder="1"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />

        {/* Tax */}
        <SelectField
          label={t('expense.tax')}
          options={taxOptions}
          value={tax}
          onChange={v => setTax(v as TaxOption)}
        />

        {/* Payment Mode */}
        <SelectField
          label={t('expense.paymentMode.label')}
          options={paymentModeOptions}
          value={paymentMode}
          onChange={v => setPaymentMode(v as PaymentMode)}
        />

        {/* Receipt upload placeholder */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>{t('expense.receipt')}</Text>
        <TouchableOpacity style={[styles.receiptBox, {borderColor: theme.border, backgroundColor: theme.surface}]}>
          <Text style={styles.receiptIcon}>📎</Text>
          <Text style={[styles.receiptText, {color: theme.textSecondary}]}>{t('expense.uploadReceipt')}</Text>
        </TouchableOpacity>

        {/* Notes */}
        <TextInput
          label={t('expense.notes')}
          placeholder="..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.draftBtn, {borderColor: colors.primary}]}
            onPress={() => {
              if (validate()) {mutation.mutate(true);}
            }}
            disabled={mutation.isPending}>
            <Text style={[styles.draftBtnText, {color: colors.primary}]}>{t('leave.saveDraft')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, {backgroundColor: colors.primary}]}
            onPress={() => {
              if (validate()) {mutation.mutate(false);}
            }}
            disabled={mutation.isPending}>
            <Text style={styles.submitBtnText}>{t('common.submit')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  row2: {flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start'},
  receiptBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  receiptIcon: {fontSize: 28},
  receiptText: {fontSize: fontSize.sm},
  btnRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs},
  draftBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  draftBtnText: {fontSize: fontSize.sm, fontWeight: '700'},
  submitBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
