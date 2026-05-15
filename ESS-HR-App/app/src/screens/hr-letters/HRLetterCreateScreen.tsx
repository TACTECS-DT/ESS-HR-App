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
import SelectField from '../../components/common/SelectField';
import StatusChip from '../../components/common/StatusChip';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {HRLetter, SalaryType} from '../../api/mocks/hr-letters.mock';
import {API_MAP} from '../../api/apiMap';

const SALARY_TYPES: {key: SalaryType; en: string; ar: string}[] = [
  {key: 'net', en: 'Net Salary', ar: 'صافي الراتب'},
  {key: 'gross', en: 'Gross Salary', ar: 'الراتب الإجمالي'},
];

export default function HRLetterCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const user = useAppSelector(state => state.auth.user);

  const salaryTypeOptions = SALARY_TYPES.map(s => ({
    label: isAr ? s.ar : s.en,
    value: s.key,
  }));

  const {showError, showValidationError} = useApiError();

  const [letterTitle, setLetterTitle] = useState('');
  const [directedTo, setDirectedTo] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [salaryType, setSalaryType] = useState<SalaryType>('net');

  const {data: previousList} = useQuery({
    queryKey: ['hr-letters'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.hrLetters.list);
      return isApiSuccess(res.data) ? (res.data.data as HRLetter[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(API_MAP.hrLetters.list, {
        title: letterTitle,
        directed_to: directedTo,
        required_date: requiredDate,
        purpose,
        salary_type: salaryType,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['hr-letters']});
      Alert.alert(t('common.done'), t('hrLetter.request') + ' ✓');
      navigation.goBack();
    },
    onError: (err) => showError(err),
  });

  function handleSubmit() {
    if (!letterTitle.trim() || !directedTo.trim() || !requiredDate.trim() || !purpose.trim()) {
      showValidationError('Please fill all required fields');
      return;
    }
    mutation.mutate();
  }

  function handleSaveDraft() {
    Alert.alert(t('common.done'), t('hrLetter.saveDraft') + ' ✓');
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('hrLetter.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee (readonly) */}
        <TextInput
          label={t('common.employee')}
          value={isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
          onChangeText={() => {}}
          editable={false}
        />

        {/* New HR Letter section */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('hrLetter.newRequest')}</Text>

        <TextInput
          label={`${t('hrLetter.letterTitle')} *`}
          placeholder={t('hrLetter.titlePlaceholder')}
          value={letterTitle}
          onChangeText={setLetterTitle}
        />

        <TextInput
          label={`${t('hrLetter.directedTo')} *`}
          placeholder={t('hrLetter.directedToExample')}
          value={directedTo}
          onChangeText={setDirectedTo}
        />

        <DatePickerField
          label={`${t('hrLetter.requiredDate')} *`}
          value={requiredDate}
          onChange={setRequiredDate}
        />

        <TextInput
          label={`${t('hrLetter.purpose')} *`}
          placeholder={t('hrLetter.purposePlaceholder')}
          value={purpose}
          onChangeText={setPurpose}
          multiline
          numberOfLines={3}
        />

        {/* Salary Type */}
        <SelectField
          label={`${t('hrLetter.salaryType')} *`}
          options={salaryTypeOptions}
          value={salaryType}
          onChange={v => setSalaryType(v as SalaryType)}
        />

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnOutline, {borderColor: colors.primary}]}
            onPress={handleSaveDraft}>
            <Text style={[styles.btnOutlineText, {color: colors.primary}]}>
              {t('hrLetter.saveDraft')}
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
        {(previousList ?? []).length > 0 ? (
          <>
            <View style={[styles.separator, {borderColor: theme.border}]} />
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('hrLetter.previousRequests')}</Text>
            {(previousList ?? []).map(item => (
              <View
                key={item.id}
                style={[styles.requestRow, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <View style={{flex: 1, gap: 3}}>
                  <Text style={[styles.requestTitle, {color: theme.text}]}>
                    {isAr
                      ? `شهادة راتب - ${item.directed_to}`
                      : `Salary Certificate - ${item.directed_to}`}
                  </Text>
                  <Text style={[styles.requestSub, {color: theme.textSecondary}]}>
                    {item.request_date} · {t(`hrLetter.type.${item.salary_type}`)}
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
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},

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
