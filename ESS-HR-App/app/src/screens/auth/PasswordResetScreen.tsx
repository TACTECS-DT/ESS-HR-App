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
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';
import ScreenHeader from '../../components/common/ScreenHeader';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors} from '../../config/theme';

type Step = 'email' | 'code' | 'newPassword';

export default function PasswordResetScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) {return;}
    setLoading(true);
    // Mock: always succeeds
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setStep('code');
  }

  async function handleVerifyCode() {
    if (code.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setStep('newPassword');
  }

  async function handleReset() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setSuccess(true);
  }

  const showEmail = step === 'email';
  const showCode = step === 'code';
  const showNewPassword = step === 'newPassword';

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={t('auth.passwordReset.title')}
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.successText, {color: theme.text}]}>
              {t('auth.passwordReset.resetSuccess')}
            </Text>
            <Button label={t('auth.login')} onPress={() => navigation.goBack()} />
          </View>
        ) : (
          <View style={[styles.card, {backgroundColor: theme.surface}]}>
            <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
              {t('auth.passwordReset.subtitle')}
            </Text>

            {showEmail && (
              <>
                <TextInput
                  label={t('auth.passwordReset.email')}
                  placeholder="badge_id or email@company.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
                <Button
                  label={t('auth.passwordReset.sendCode')}
                  onPress={handleSendCode}
                  loading={loading}
                  fullWidth
                />
              </>
            )}

            {showCode && (
              <>
                <TextInput
                  label={t('auth.passwordReset.verifyCode')}
                  placeholder={t('auth.passwordReset.codePlaceholder')}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="numeric"
                  maxLength={6}
                  error={error}
                />
                <Button
                  label={t('auth.passwordReset.verifyCode')}
                  onPress={handleVerifyCode}
                  loading={loading}
                  fullWidth
                />
              </>
            )}

            {showNewPassword && (
              <>
                <TextInput
                  label={t('auth.passwordReset.newPassword')}
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  secureToggle
                />
                <TextInput
                  label={t('auth.passwordReset.confirmPassword')}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  secureToggle
                  error={error}
                />
                <Button
                  label={t('common.submit')}
                  onPress={handleReset}
                  loading={loading}
                  fullWidth
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {flexGrow: 1, padding: spacing.lg},
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  subtitle: {fontSize: fontSize.sm, marginBottom: spacing.lg},
  successBox: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md},
  successIcon: {fontSize: 64},
  successText: {fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center'},
  error: {color: colors.error, marginBottom: spacing.md, fontSize: fontSize.sm},
});
