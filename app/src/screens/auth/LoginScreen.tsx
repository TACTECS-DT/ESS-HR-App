import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp, RouteProp} from '@react-navigation/stack';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {setCredentials} from '../../store/slices/authSlice';
import {saveTokens} from '../../utils/secureStorage';
import type {AuthStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;
type Route = RouteProp<AuthStackParamList, 'Login'>;

type LoginMode = 'badge' | 'username';

export default function LoginScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const {companyId, companyName} = route.params;

  const [mode, setMode] = useState<LoginMode>('badge');
  const [badgeId, setBadgeId] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isBadgeMode = mode === 'badge';

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const body = isBadgeMode
        ? {badge_id: badgeId, pin, company_id: companyId}
        : {username, password, company_id: companyId};

      const res = await apiClient.post('/auth/login', body);
      const data = res.data;
      if (isApiSuccess(data)) {
        const {user, tokens} = data.data;
        await saveTokens(tokens.access_token, tokens.refresh_token);
        dispatch(
          setCredentials({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            user,
            companyId,
            companyName,
          }),
        );
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
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.text}]}>{t('auth.loginTitle')}</Text>
          <Text style={[styles.companyName, {color: colors.primary}]}>{companyName}</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {t('auth.loginSubtitle')}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <TouchableOpacity
            style={[styles.modeBtn, isBadgeMode && {backgroundColor: colors.primary}]}
            onPress={() => setMode('badge')}>
            <Text style={{color: isBadgeMode ? colors.white : theme.textSecondary, fontWeight: '600'}}>
              {t('auth.loginWithBadge')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, !isBadgeMode && {backgroundColor: colors.primary}]}
            onPress={() => setMode('username')}>
            <Text style={{color: !isBadgeMode ? colors.white : theme.textSecondary, fontWeight: '600'}}>
              {t('auth.loginWithUsername')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, {backgroundColor: theme.surface}]}>
          {isBadgeMode ? (
            <>
              <TextInput
                label={t('auth.badgeId')}
                placeholder={t('auth.badgeIdPlaceholder')}
                value={badgeId}
                onChangeText={setBadgeId}
                autoCapitalize="none"
              />
              <TextInput
                label={t('auth.pin')}
                placeholder={t('auth.pinPlaceholder')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                secureToggle
                keyboardType="numeric"
                maxLength={8}
              />
            </>
          ) : (
            <>
              <TextInput
                label={t('auth.username')}
                placeholder={t('auth.usernamePlaceholder')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
              />
            </>
          )}

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Button label={t('auth.login')} onPress={handleLogin} loading={loading} fullWidth />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('PasswordReset')}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm}}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {flexGrow: 1, justifyContent: 'center', padding: spacing.lg},
  header: {alignItems: 'center', marginBottom: spacing.xl},
  title: {fontSize: fontSize.xxl, fontWeight: '700', marginBottom: spacing.xs},
  companyName: {fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xs},
  subtitle: {fontSize: fontSize.sm},
  modeToggle: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  error: {color: colors.error, marginBottom: spacing.md, fontSize: fontSize.sm},
  forgotBtn: {alignItems: 'center', marginTop: spacing.md},
});
