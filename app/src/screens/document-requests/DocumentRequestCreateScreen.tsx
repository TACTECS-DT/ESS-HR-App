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
import StatusChip from '../../components/common/StatusChip';
import TextInput from '../../components/common/TextInput';
import DatePickerField from '../../components/common/DatePickerField';
import SelectField from '../../components/common/SelectField';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {DocumentType, DocumentRequest} from '../../api/mocks/document-requests.mock';
import {API_MAP} from '../../api/apiMap';

export default function DocumentRequestCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const user = useAppSelector(state => state.auth.user);

  const [requestTitle, setRequestTitle] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [reason, setReason] = useState('');

  const {data: types} = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.documentRequests.types);
      return isApiSuccess(res.data) ? (res.data.data as DocumentType[]) : [];
    },
  });

  const {data: prevRequests} = useQuery({
    queryKey: ['document-requests'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.documentRequests.list);
      return isApiSuccess(res.data) ? (res.data.data as DocumentRequest[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await apiClient.post(API_MAP.documentRequests.list, {
        title: requestTitle,
        document_type_id: selectedTypeId,
        return_date: returnDate,
        reason,
        status: isDraft ? 'draft' : 'pending',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['document-requests']});
      Alert.alert(t('common.done'), t('documentRequest.request') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit(isDraft: boolean) {
    if (!requestTitle.trim() || !selectedTypeId) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
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
      <ScreenHeader title={t('documentRequest.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee (readonly) */}
        <TextInput
          label={t('common.employee')}
          value={isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
          onChangeText={() => {}}
          editable={false}
        />

        <TextInput
          label={`${t('documentRequest.requestTitle')} *`}
          placeholder={t('documentRequest.requestTitle')}
          value={requestTitle}
          onChangeText={setRequestTitle}
        />

        {/* Document Type */}
        <SelectField
          label={`${t('documentRequest.documentType')} *`}
          options={typeOptions}
          value={selectedTypeId}
          onChange={v => setSelectedTypeId(v as number)}
          placeholder={t('documentRequest.documentType')}
        />

        <DatePickerField
          label={t('documentRequest.returnDate')}
          value={returnDate}
          onChange={setReturnDate}
        />

        <TextInput
          label={`${t('documentRequest.reason')} *`}
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
              {t('documentRequest.saveDraft')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, {backgroundColor: colors.primary}]}
            onPress={() => handleSubmit(false)}
            disabled={mutation.isPending}>
            <Text style={styles.submitBtnText}>{t('common.submit')}</Text>
          </TouchableOpacity>
        </View>

        {/* Previous Requests */}
        {(prevRequests ?? []).length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('documentRequest.previousRequests')}
            </Text>
            {(prevRequests ?? []).map(req => (
              <View
                key={req.id}
                style={[styles.prevCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                <View style={styles.prevCardRow}>
                  <Text style={[styles.prevCardTitle, {color: theme.text}]} numberOfLines={1}>
                    {isAr ? req.document_type_ar : req.document_type}
                  </Text>
                  <StatusChip status={req.status} label={t(`common.status.${req.status}`)} />
                </View>
                <Text style={[styles.prevCardDate, {color: theme.textSecondary}]}>
                  {req.request_date}
                </Text>
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
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.md},
  prevCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
  },
  prevCardRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  prevCardTitle: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, marginRight: spacing.sm},
  prevCardDate: {fontSize: fontSize.xs},
});
