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

  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);

  type ErrorType =
    | 'INVALID_URL'
    | 'SERVER_UNREACHABLE'
    | 'SERVER_NOT_FOUND'
    | 'LICENSE_INACTIVE'
    | 'LICENSE_EXPIRED'
    | 'GENERIC';
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [errorBody, setErrorBody] = useState('');

  function showError(code: string | undefined, fallbackMessage: string) {
    if (
      code === 'INVALID_URL' ||
      code === 'SERVER_UNREACHABLE' ||
      code === 'SERVER_NOT_FOUND' ||
      code === 'LICENSE_INACTIVE' ||
      code === 'LICENSE_EXPIRED'
    ) {
      setErrorType(code);
      setErrorBody('');
    } else {
      setErrorType('GENERIC');
      setErrorBody(fallbackMessage);
    }
  }

  const ERROR_CONFIG: Record<ErrorType, {emoji: string; title: string; body: string}> = {
    INVALID_URL: {
      emoji: '🔗',
      title: t('auth.errors.invalidUrl.title'),
      body:  t('auth.errors.invalidUrl.body'),
    },
    SERVER_UNREACHABLE: {
      emoji: '📡',
      title: t('auth.errors.serverUnreachable.title'),
      body:  t('auth.errors.serverUnreachable.body'),
    },
    SERVER_NOT_FOUND: {
      emoji: '🔍',
      title: t('auth.errors.serverNotFound.title'),
      body:  t('auth.errors.serverNotFound.body'),
    },
    LICENSE_INACTIVE: {
      emoji: '🔒',
      title: t('auth.errors.licenseInactive.title'),
      body:  t('auth.errors.licenseInactive.body'),
    },
    LICENSE_EXPIRED: {
      emoji: '⏰',
      title: t('auth.errors.licenseExpired.title'),
      body:  t('auth.errors.licenseExpired.body'),
    },
    GENERIC: {
      emoji: '⚠️',
      title: t('common.error'),
      body:  errorBody,
    },
  };

  const allFilled = serverUrl.trim();

  async function handleActivate() {
    const raw = serverUrl.trim();
    if (!raw) {
      showError('GENERIC', t('common.error'));
      return;
    }

    // Validate URL format before hitting the network
    if (!/^https?:\/\/.+\..+/.test(raw)) {
      showError('INVALID_URL', '');
      return;
    }

    setLoading(true);
    setErrorType(null);
    try {
      const base = raw.replace(/\/$/, '');
      const res = await apiClient.post(API_MAP.auth.validateLicense, {
        server_url: base,
      }, {
        baseURL: base + '/ess/api',
      });
      const data = res.data;
      if (isApiSuccess(data)) {
        dispatch(setLicenseContext({serverUrl: base}));
        navigation.navigate('CompanySelection', {companies: data.data.companies});
      } else {
        showError(data.error?.code, data.error?.message || t('common.error'));
      }
    } catch (err: any) {
      if (!err?.response) {
        // Network error — server unreachable, DNS failure, timeout, etc.
        showError('SERVER_UNREACHABLE', '');
      } else {
        const errData = err.response.data?.error;
        showError(errData?.code, errData?.message || t('common.error'));
      }
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
            label={t('auth.serverUrl') + ' *'}
            placeholder={t('auth.serverUrlPlaceholder')}
            value={serverUrl}
            onChangeText={v => { setServerUrl(v); setErrorType(null); }}
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

      {/* ── License / server error dialog ────────────────────────────────── */}
      <Modal
        visible={!!errorType}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorType(null)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setErrorType(null)}>
          {errorType && (() => {
            const cfg = ERROR_CONFIG[errorType];
            return (
              <View style={[styles.errorDialog, {backgroundColor: theme.surface}]}>
                <View style={styles.errorIconWrap}>
                  <Text style={styles.errorEmoji}>{cfg.emoji}</Text>
                </View>
                <Text style={[styles.errorTitle, {color: theme.text}]}>{cfg.title}</Text>
                <Text style={styles.errorBody}>{cfg.body}</Text>
                <TouchableOpacity
                  style={styles.errorDismissBtn}
                  onPress={() => setErrorType(null)}>
                  <Text style={styles.errorDismissBtnLabel}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
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
