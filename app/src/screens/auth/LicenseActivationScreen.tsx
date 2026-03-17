import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AuthStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'LicenseActivation'>;

export default function LicenseActivationScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();

  const [licenseKey, setLicenseKey] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [database, setDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{licenseKey?: string; companyUrl?: string; database?: string}>({});

  const allFilled = licenseKey.trim() && companyUrl.trim() && database.trim();

  async function handleActivate() {
    const newErrors: typeof errors = {};
    if (!licenseKey.trim()) {newErrors.licenseKey = t('auth.errors.invalidLicense');}
    if (!companyUrl.trim())  {newErrors.companyUrl  = t('common.error');}
    if (!database.trim())    {newErrors.database    = t('common.error');}
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const res = await apiClient.post('/auth/validate-license', {
        license_key: licenseKey.trim(),
        company_url: companyUrl.trim(),
        database: database.trim(),
      });
      const data = res.data;
      if (isApiSuccess(data)) {
        navigation.navigate('CompanySelection', {companies: data.data.companies});
      } else {
        setErrors({licenseKey: data.error.message});
      }
    } catch {
      setErrors({licenseKey: t('common.error')});
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoBox, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            <Text style={styles.logoEmoji}>🏢</Text>
          </View>
          <Text style={[styles.appName, {color: colors.primary}]}>ESS Pro</Text>
          <Text style={[styles.appTagline, {color: theme.textSecondary}]}>
            {t('auth.licenseSubtitle')}
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <TextInput
            label={t('auth.licenseKey') + ' *'}
            placeholder={t('auth.licenseKeyPlaceholder')}
            value={licenseKey}
            onChangeText={v => {setLicenseKey(v); setErrors(e => ({...e, licenseKey: undefined}));}}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            error={errors.licenseKey}
          />

          <TextInput
            label={t('auth.companyUrl') + ' *'}
            placeholder={t('auth.companyUrlPlaceholder')}
            value={companyUrl}
            onChangeText={v => {setCompanyUrl(v); setErrors(e => ({...e, companyUrl: undefined}));}}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={errors.companyUrl}
          />

          <TextInput
            label={t('auth.database') + ' *'}
            placeholder={t('auth.databasePlaceholder')}
            value={database}
            onChangeText={v => {setDatabase(v); setErrors(e => ({...e, database: undefined}));}}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.database}
          />

          <Button
            label={t('auth.activate')}
            onPress={handleActivate}
            loading={loading}
            disabled={!allFilled}
            fullWidth
          />
        </View>

        {/* Footer hint */}
        <Text style={[styles.footer, {color: theme.textSecondary}]}>
          {t('auth.contactHR')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  logoArea: {alignItems: 'center', gap: spacing.sm},
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoEmoji: {fontSize: 44},
  appName: {fontSize: 26, fontWeight: '700'},
  appTagline: {fontSize: fontSize.sm, textAlign: 'center'},
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  footer: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
