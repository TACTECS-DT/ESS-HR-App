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
import {useAppSelector} from '../../hooks/useAppSelector';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {ServiceType} from '../../api/mocks/business-services.mock';
import {API_MAP} from '../../api/apiMap';

export default function BusinessServiceCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const user = useAppSelector(state => state.auth.user);

  const {showError, showValidationError} = useApiError();

  const [serviceTitle, setServiceTitle] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [wantedDate, setWantedDate] = useState('');
  const [reason, setReason] = useState('');

  const {data: types} = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.businessServices.types);
      return isApiSuccess(res.data) ? (res.data.data as ServiceType[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await apiClient.post(API_MAP.businessServices.list, {
        title: serviceTitle,
        service_type_id: selectedTypeId,
        requested_date: wantedDate,
        reason,
        status: isDraft ? 'draft' : 'pending',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['business-services']});
      Alert.alert(t('common.done'), t('businessService.request') + ' ✓');
      navigation.goBack();
    },
    onError: (err) => showError(err),
  });

  function handleSubmit(isDraft: boolean) {
    if (!serviceTitle.trim() || !selectedTypeId || !reason.trim()) {
      showValidationError('Please fill all required fields');
      return;
    }
    mutation.mutate(isDraft);
  }

  const typeOptions = useMemo(() =>
    (types ?? []).map(type => ({label: isAr ? type.name_ar : type.name, value: type.id})),
  [types, isAr]);

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('businessService.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee (readonly) */}
        <TextInput
          label={t('common.employee')}
          value={isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
          onChangeText={() => {}}
          editable={false}
        />

        <TextInput
          label={`${t('businessService.serviceTitle')} *`}
          placeholder={t('businessService.serviceTitle')}
          value={serviceTitle}
          onChangeText={setServiceTitle}
        />

        {/* Service Type */}
        <SelectField
          label={`${t('businessService.serviceType')} *`}
          options={typeOptions}
          value={selectedTypeId}
          onChange={v => setSelectedTypeId(v as number)}
          placeholder={t('businessService.serviceType')}
        />

        <DatePickerField
          label={`${t('businessService.wantedDate')} *`}
          value={wantedDate}
          onChange={setWantedDate}
        />

        <TextInput
          label={`${t('businessService.reason')} *`}
          placeholder="..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.draftBtn, {borderColor: colors.primary}]}
            onPress={() => handleSubmit(true)}
            disabled={mutation.isPending}>
            <Text style={[styles.draftBtnText, {color: colors.primary}]}>
              {t('businessService.saveDraft')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, {backgroundColor: colors.primary}]}
            onPress={() => handleSubmit(false)}
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
  btnRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
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
