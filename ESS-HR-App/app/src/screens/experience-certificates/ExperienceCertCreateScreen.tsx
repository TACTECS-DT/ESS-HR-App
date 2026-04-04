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
import {useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {API_MAP} from '../../api/apiMap';
import ScreenHeader from '../../components/common/ScreenHeader';
import TextInput from '../../components/common/TextInput';
import DatePickerField from '../../components/common/DatePickerField';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';

export default function ExperienceCertCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const user = useAppSelector(state => state.auth.user);

  const {showError, showValidationError} = useApiError();

  const [certTitle, setCertTitle] = useState('');
  const [directedTo, setDirectedTo] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [purpose, setPurpose] = useState('');

  const mutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await apiClient.post(API_MAP.certificates.list, {
        title: certTitle,
        directed_to: directedTo,
        required_date: requiredDate,
        purpose,
        status: isDraft ? 'draft' : 'pending',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['experience-certs']});
      Alert.alert(t('common.done'), t('expCert.request') + ' ✓');
      navigation.goBack();
    },
    onError: (err) => showError(err),
  });

  function handleSubmit(isDraft: boolean) {
    if (!certTitle.trim() || !directedTo.trim()) {
      showValidationError('Please fill all required fields');
      return;
    }
    mutation.mutate(isDraft);
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('expCert.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee (readonly) */}
        <TextInput
          label={t('common.employee')}
          value={isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
          onChangeText={() => {}}
          editable={false}
        />

        <TextInput
          label={`${t('expCert.certTitle')} *`}
          placeholder={t('expCert.certTitle')}
          value={certTitle}
          onChangeText={setCertTitle}
        />

        <TextInput
          label={`${t('expCert.directedTo')} *`}
          placeholder={t('expCert.directedToPlaceholder')}
          value={directedTo}
          onChangeText={setDirectedTo}
        />

        <DatePickerField
          label={`${t('expCert.requiredDate')} *`}
          value={requiredDate}
          onChange={setRequiredDate}
        />

        <TextInput
          label={`${t('expCert.purpose')} *`}
          placeholder="..."
          value={purpose}
          onChangeText={setPurpose}
          multiline
          numberOfLines={3}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.draftBtn, {borderColor: colors.primary}]}
            onPress={() => handleSubmit(true)}
            disabled={mutation.isPending}>
            <Text style={[styles.draftBtnText, {color: colors.primary}]}>
              {t('expCert.saveDraft')}
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
