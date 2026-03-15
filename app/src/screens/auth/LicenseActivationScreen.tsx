import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize} from '../../config/theme';
import type {AuthStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'LicenseActivation'>;

export default function LicenseActivationScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleActivate() {
    if (!key.trim()) {
      setError(t('auth.errors.invalidLicense'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/validate-license', {license_key: key.trim()});
      const data = res.data;
      if (isApiSuccess(data)) {
        navigation.navigate('CompanySelection', {companies: data.data.companies});
      } else {
        setError(data.error.message);
      }
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>🏢</Text>
          <Text style={[styles.title, {color: theme.text}]}>{t('auth.licenseTitle')}</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {t('auth.licenseSubtitle')}
          </Text>
        </View>
        <View style={[styles.card, {backgroundColor: theme.surface}]}>
          <TextInput
            label={t('auth.licenseKey')}
            placeholder={t('auth.licenseKeyPlaceholder')}
            value={key}
            onChangeText={setKey}
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
          />
          <Button
            label={t('auth.activate')}
            onPress={handleActivate}
            loading={loading}
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {flexGrow: 1, justifyContent: 'center', padding: spacing.lg},
  logoArea: {alignItems: 'center', marginBottom: spacing.xl},
  logo: {fontSize: 64, marginBottom: spacing.md},
  title: {fontSize: fontSize.xxl, fontWeight: '700', marginBottom: spacing.xs},
  subtitle: {fontSize: fontSize.md, textAlign: 'center'},
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
