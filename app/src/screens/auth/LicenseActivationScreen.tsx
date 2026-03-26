import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Keyboard,
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
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {setLicenseContext} from '../../store/slices/authSlice';
import type {AuthStackParamList} from '../../navigation/types';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<AuthStackParamList, 'LicenseActivation'>;

export default function LicenseActivationScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [licenseKey, setLicenseKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');   // single error string → shown in modal

  const allFilled = licenseKey.trim() && serverUrl.trim();

  async function handleActivate() {
    // Local validation — show modal for empty fields too
    if (!licenseKey.trim()) {
      setError(t('auth.errors.invalidLicense'));
      return;
    }
    if (!serverUrl.trim()) {
      setError(t('common.error'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(API_MAP.auth.validateLicense, {
        license_key: licenseKey.trim(),
        server_url: serverUrl.trim(),
      });
      const data = res.data;
      if (isApiSuccess(data)) {
        dispatch(setLicenseContext({
          licenseKey: licenseKey.trim(),
          serverUrl: serverUrl.trim(),
        }));
        navigation.navigate('CompanySelection', {companies: data.data.companies});
      } else {
        setError(data.error.message);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      setError(msg || t('common.error'));
    } finally {
      setLoading(false);
      Keyboard.dismiss();
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

        {/* Form card — no error props on inputs */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <TextInput
            label={t('auth.licenseKey') + ' *'}
            placeholder={t('auth.licenseKeyPlaceholder')}
            value={licenseKey}
            onChangeText={v => { setLicenseKey(v); setError(''); }}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
          />

          <TextInput
            label={t('auth.serverUrl') + ' *'}
            placeholder={t('auth.serverUrlPlaceholder')}
            value={serverUrl}
            onChangeText={v => { setServerUrl(v); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
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

      {/* ── Invalid license / server wizard ──────────────────────────────── */}
      <Modal
        visible={!!error}
        transparent
        animationType="fade"
        onRequestClose={() => setError('')}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setError('')}>
          <View style={[styles.errorDialog, {backgroundColor: theme.surface}]}>
            <View style={styles.errorIconWrap}>
              <Text style={styles.errorEmoji}>⚠️</Text>
            </View>
            <Text style={[styles.errorTitle, {color: theme.text}]}>
              {t('auth.errors.invalidLicense')}
            </Text>
            <Text style={styles.errorBody}>{error}</Text>
            <TouchableOpacity
              style={styles.errorDismissBtn}
              onPress={() => setError('')}>
              <Text style={styles.errorDismissBtnLabel}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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

  // ── Error modal ────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorDialog: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.error,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.error,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B3018',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  errorEmoji: {fontSize: 28},
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  errorDismissBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  errorDismissBtnLabel: {
    color: colors.error,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
});
