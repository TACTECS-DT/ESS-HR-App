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
import type {ServiceType} from '../../api/mocks/business-services.mock';

export default function BusinessServiceCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [serviceTitle, setServiceTitle] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState('');
  const [wantedDate, setWantedDate] = useState('');
  const [reason, setReason] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const {data: types} = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const res = await apiClient.get('/business-services/types');
      return isApiSuccess(res.data) ? (res.data.data as ServiceType[]) : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await apiClient.post('/business-services', {
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
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit(isDraft: boolean) {
    if (!serviceTitle.trim() || !selectedTypeId || !reason.trim()) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
      return;
    }
    mutation.mutate(isDraft);
  }

  function selectType(type: ServiceType) {
    setSelectedTypeId(type.id);
    setSelectedTypeName(isAr ? type.name_ar : type.name);
    setShowTypeDropdown(false);
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('businessService.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <TextInput
          label={`${t('businessService.serviceTitle')} *`}
          placeholder={t('businessService.serviceTitle')}
          value={serviceTitle}
          onChangeText={setServiceTitle}
        />

        {/* Service Type dropdown */}
        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>
            {t('businessService.serviceType')} *
          </Text>
          <TouchableOpacity
            style={[styles.dropdown, {borderColor: theme.border, backgroundColor: theme.surface}]}
            onPress={() => setShowTypeDropdown(v => !v)}>
            <Text style={[styles.dropdownText, {color: selectedTypeId ? theme.text : theme.textSecondary}]}>
              {selectedTypeName || t('businessService.serviceType')}
            </Text>
            <Text style={[styles.chevron, {color: theme.textSecondary}]}>
              {showTypeDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showTypeDropdown ? (
            <View style={[styles.dropdownList, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {(types ?? []).map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.dropdownItem, {borderBottomColor: theme.border}]}
                  onPress={() => selectType(type)}>
                  <Text style={[styles.dropdownItemText, {color: theme.text}]}>
                    {isAr ? type.name_ar : type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <TextInput
          label={`${t('businessService.wantedDate')} *`}
          placeholder="YYYY-MM-DD"
          value={wantedDate}
          onChangeText={setWantedDate}
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
  label: {fontSize: fontSize.sm, fontWeight: '600', marginBottom: 4},
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dropdownText: {fontSize: fontSize.sm},
  chevron: {fontSize: fontSize.xs},
  dropdownList: {
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: 2,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  dropdownItemText: {fontSize: fontSize.sm},
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
