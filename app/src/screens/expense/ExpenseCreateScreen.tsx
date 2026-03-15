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
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {ExpenseCategory} from '../../api/mocks/expense.mock';

type Currency = 'SAR' | 'AED' | 'USD' | 'EUR';
type PaymentMode = 'employee_paid' | 'company_paid';
type TaxOption = 'none' | 'vat15' | 'vat5';

const CURRENCIES: Currency[] = ['SAR', 'AED', 'USD', 'EUR'];
const PAYMENT_MODES: PaymentMode[] = ['employee_paid', 'company_paid'];
const TAX_OPTIONS: TaxOption[] = ['none', 'vat15', 'vat5'];

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  getLabel,
  theme,
}: {
  label: string;
  options: T[];
  value: T;
  onSelect: (v: T) => void;
  getLabel: (v: T) => string;
  theme: any;
}) {
  return (
    <View style={{gap: 6}}>
      <Text style={[styles.label, {color: theme.textSecondary}]}>{label}</Text>
      <View style={[styles.segRow, {borderColor: theme.border}]}>
        {options.map((opt, idx) => {
          const isActive = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.segBtn,
                {borderColor: theme.border},
                idx > 0 && {borderLeftWidth: 1},
                isActive && {backgroundColor: colors.primary},
              ]}
              onPress={() => onSelect(opt)}>
              <Text style={[styles.segBtnText, {color: isActive ? '#fff' : theme.text}]}>
                {getLabel(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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

  const {data: categories} = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return isApiSuccess(res.data) ? (res.data.data as ExpenseCategory[]) : [];
    },
  });

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
          placeholder={isAr ? 'مثال: غداء اجتماع العميل' : 'e.g., Client meeting lunch'}
          value={description}
          onChangeText={setDescription}
        />

        {/* Category chips */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('expense.category')} *
        </Text>
        <View style={styles.chipRow}>
          {(categories ?? []).map(cat => {
            const isActive = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  {borderColor: isActive ? colors.primary : theme.border},
                  isActive && {backgroundColor: colors.primary + '22'},
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}>
                <Text style={{
                  color: isActive ? colors.primary : theme.text,
                  fontSize: fontSize.sm,
                  fontWeight: '600',
                }}>
                  {isAr ? cat.name_ar : cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
            <Text style={[styles.label, {color: theme.textSecondary}]}>{t('expense.currency')}</Text>
            <View style={[styles.segRow, {borderColor: theme.border, flexDirection: 'column', borderRadius: radius.sm}]}>
              {CURRENCIES.map(cur => {
                const isActive = currency === cur;
                return (
                  <TouchableOpacity
                    key={cur}
                    style={[styles.dropItem, isActive && {backgroundColor: colors.primary + '22'}]}
                    onPress={() => setCurrency(cur)}>
                    <Text style={{fontSize: fontSize.sm, color: isActive ? colors.primary : theme.text, fontWeight: isActive ? '700' : '400'}}>
                      {cur}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Date */}
        <TextInput
          label={t('expense.date')}
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          keyboardType="default"
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
        <SegmentedRow
          label={t('expense.tax')}
          options={TAX_OPTIONS}
          value={tax}
          onSelect={setTax}
          getLabel={v => t(`expense.taxOptions.${v}`)}
          theme={theme}
        />

        {/* Payment Mode */}
        <SegmentedRow
          label={t('expense.paymentMode.company_paid').replace('Company Paid', '') + t('expense.paymentMode.employee_paid').replace('Employee (To Reimburse)', '') !== '' ? 'Payment Mode' : 'Payment Mode'}
          options={PAYMENT_MODES}
          value={paymentMode}
          onSelect={setPaymentMode}
          getLabel={v => t(`expense.paymentMode.${v}`)}
          theme={theme}
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
  label: {fontSize: fontSize.sm, fontWeight: '600'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  row2: {flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start'},
  segRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segBtnText: {fontSize: fontSize.xs, fontWeight: '600'},
  dropItem: {paddingHorizontal: spacing.sm, paddingVertical: 6},
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
