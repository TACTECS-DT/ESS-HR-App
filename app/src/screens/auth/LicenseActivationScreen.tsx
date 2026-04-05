import React, {useState, useEffect} from 'react';
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
import axios from 'axios';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import {isApiSuccess} from '../../types/api';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {useAppSelector} from '../../hooks/useAppSelector';
import {setAdminContext} from '../../store/slices/authSlice';
import type {AuthStackParamList} from '../../navigation/types';
import {API_MAP} from '../../api/apiMap';
import {ENV} from '../../config/appConfig';
import {MOCK_ADMIN_VALIDATE_VALID} from '../../api/mocks/auth.mock';

type Nav = StackNavigationProp<AuthStackParamList, 'LicenseActivation'>;

export default function LicenseActivationScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const knownServerUrls = useAppSelector(s => s.auth.knownServerUrls ?? []);
  const cachedServerUrl = useAppSelector(s => s.auth.serverUrl);

  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-refresh allowedModules from the admin server on every visit to this screen.
  // This ensures module permissions are always up-to-date after an admin changes the license.
  useEffect(() => {
    if (!ENV.MOCK_MODE && cachedServerUrl && cachedServerUrl !== 'mock') {
      handleActivate(cachedServerUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type ErrorType =
    | 'INVALID_URL'
    | 'SERVER_UNREACHABLE'
    | 'SERVER_NOT_FOUND'
    | 'LICENSE_INACTIVE'
    | 'LICENSE_EXPIRED'
    | 'EMPLOYEE_LIMIT'
    | 'GENERIC';
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [errorBody, setErrorBody] = useState('');

  function showError(code: string | undefined, fallbackMessage: string) {
    if (
      code === 'INVALID_URL' ||
      code === 'SERVER_UNREACHABLE' ||
      code === 'SERVER_NOT_FOUND' ||
      code === 'LICENSE_INACTIVE' ||
      code === 'LICENSE_EXPIRED' ||
      code === 'EMPLOYEE_LIMIT'
    ) {
      setErrorType(code);
      setErrorBody(code === 'EMPLOYEE_LIMIT' ? fallbackMessage : '');
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
    EMPLOYEE_LIMIT: {
      emoji: '👥',
      title: t('auth.errors.employeeLimit.title'),
      body:  errorBody || t('auth.errors.employeeLimit.body'),
    },
    GENERIC: {
      emoji: '⚠️',
      title: t('common.error'),
      body:  errorBody,
    },
  };

  async function handleActivate(urlOverride?: string) {
    // ── Mock mode: skip URL validation and admin server call entirely ──────────
    if (ENV.MOCK_MODE) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      const d = MOCK_ADMIN_VALIDATE_VALID;
      dispatch(setAdminContext({
        serverUrl: 'mock',
        allowedModules: d.data.allowed_modules ?? [],
        autoLogoutDuration: d.data.auto_logout_duration ?? 72,
      }));
      setLoading(false);
      navigation.navigate('CompanySelection');
      return;
    }

    // ── Real mode: validate URL and call admin server ──────────────────────────
    const raw = (urlOverride ?? serverUrl).trim();
    if (!raw) {
      showError('GENERIC', t('common.errorGeneric', 'An error occurred. Please try again.'));
      return;
    }
    if (!/^https?:\/\/.+/.test(raw)) {
      showError('INVALID_URL', '');
      return;
    }

    setLoading(true);
    setErrorType(null);
    Keyboard.dismiss();
    try {
      const base = raw.replace(/\/$/, '');
      const res = await axios.post(
        ENV.ESS_ADMIN_URL + API_MAP.auth.adminValidate,
        {server_url: base},
        {timeout: 15000},
      );
      const data = res.data;
      console.log('[ESS Admin] raw response:', JSON.stringify(data));
      if (isApiSuccess(data)) {
        const modules = data.data.allowed_modules ?? [];
        console.log('[ESS Admin] allowed_modules:', JSON.stringify(modules));
        dispatch(setAdminContext({
          serverUrl: base,
          allowedModules: modules,
          autoLogoutDuration: data.data.auto_logout_duration ?? 72,
        }));
        navigation.navigate('CompanySelection');
      } else {
        showError((data as any).error?.code, (data as any).error?.message || t('common.errorGeneric', 'An error occurred. Please try again.'));
      }
    } catch (err: any) {
      if (!err?.response) {
        showError('SERVER_UNREACHABLE', '');
      } else {
        const errData = err.response.data?.error;
        showError(errData?.code, errData?.message || t('common.errorGeneric', 'An error occurred. Please try again.'));
      }
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

        {/* Quick-connect chips for previously used servers */}
        {knownServerUrls.length > 0 && (
          <View style={styles.chipSection}>
            <Text style={[styles.chipLabel, {color: theme.textSecondary}]}>
              {t('auth.recentServers')}
            </Text>
            <View style={styles.chipRow}>
              {knownServerUrls.map(url => (
                <TouchableOpacity
                  key={url}
                  style={[styles.chip, {backgroundColor: theme.surface, borderColor: theme.border}]}
                  onPress={() => {
                    setServerUrl(url);
                    handleActivate(url);
                  }}
                  disabled={loading}>
                  <Text style={[styles.chipText, {color: colors.primary}]} numberOfLines={1}>
                    {url.replace(/^https?:\/\//, '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Form card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          {!ENV.MOCK_MODE && (
            <TextInput
              label={t('auth.serverUrl') + ' *'}
              placeholder={t('auth.serverUrlPlaceholder')}
              value={serverUrl}
              onChangeText={v => { setServerUrl(v); setErrorType(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          )}

          <Button
            label={t('auth.activate')}
            onPress={() => handleActivate()}
            loading={loading}
            disabled={!ENV.MOCK_MODE && !serverUrl.trim()}
            fullWidth
          />
        </View>

        {/* Footer hint */}
        <Text style={[styles.footer, {color: theme.textSecondary}]}>
          {t('auth.contactHR')}
        </Text>
      </ScrollView>

      {/* ── Admin / license error dialog ─────────────────────────────────── */}
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

  chipSection: {gap: spacing.xs},
  chipLabel: {fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {fontSize: fontSize.sm, fontWeight: '500'},

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
