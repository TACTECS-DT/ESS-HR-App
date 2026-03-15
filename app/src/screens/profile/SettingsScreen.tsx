import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import ScreenHeader from '../../components/common/ScreenHeader';
import type {MoreStackParamList} from '../../navigation/types';
import {useTheme} from '../../hooks/useTheme';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {useAppSelector} from '../../hooks/useAppSelector';
import {setLanguage, toggleDarkMode} from '../../store/slices/settingsSlice';
import {clearAuth} from '../../store/slices/authSlice';
import {toggleLanguage} from '../../i18n/';
import {clearTokens} from '../../utils/secureStorage';
import {spacing, fontSize, colors, radius} from '../../config/theme';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<StackNavigationProp<MoreStackParamList>>();
  const darkMode = useAppSelector(state => state.settings.darkMode);
  const currentLanguage = useAppSelector(state => state.settings.language);

  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometric, setBiometric] = useState(true);

  const aboutRows = [
    {label: t('settings.appVersion'), value: APP_VERSION},
    {label: t('settings.company'), value: 'ABC Corporation'},
    {label: t('settings.license'), value: 'Premium'},
    {label: t('settings.licenseExpiry'), value: 'Mar 10, 2027'},
  ];

  async function handleToggleLanguage() {
    const nextLang = currentLanguage === 'en' ? 'ar' : 'en';
    await toggleLanguage();
    dispatch(setLanguage(nextLang));
  }

  function handleToggleDarkMode() {
    dispatch(toggleDarkMode());
  }

  async function handleLogout() {
    Alert.alert(t('settings.logout'), `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          dispatch(clearAuth());
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={t('settings.title')}
        showBack
        onBack={() => navigation.getParent()?.navigate('HomeTab' as never)}
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('settings.appearance')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>🌙 {t('settings.darkMode')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>
                {darkMode ? t('settings.enabled') : t('settings.disabled')}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{false: colors.gray300, true: colors.primary}}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Language */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('settings.language')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <TouchableOpacity style={styles.settingRow} onPress={handleToggleLanguage}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>🌐 {t('settings.language')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>
                {currentLanguage === 'en' ? 'Currently: English' : 'الحالية: العربية'}
              </Text>
            </View>
            <View style={[styles.langBadge, {backgroundColor: colors.primary + '22'}]}>
              <Text style={[styles.langBadgeText, {color: colors.primary}]}>
                {currentLanguage === 'en' ? 'English ▾' : 'العربية ▾'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('settings.notifications')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>🔔 {t('settings.pushNotifications')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{false: colors.gray300, true: colors.primary}}
              thumbColor={colors.white}
            />
          </View>
          <View style={[styles.rowDivider, {borderColor: theme.border}]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>⏰ {t('settings.checkinReminder')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>{t('settings.checkinReminderSub')}</Text>
            </View>
            <Text style={[styles.linkText, {color: colors.primary}]}>{'Edit ▸'}</Text>
          </View>
          <View style={[styles.rowDivider, {borderColor: theme.border}]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>⏰ {t('settings.checkoutReminder')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>{t('settings.checkoutReminderSub')}</Text>
            </View>
            <Text style={[styles.linkText, {color: colors.primary}]}>{'Edit ▸'}</Text>
          </View>
        </View>

        {/* Security */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('settings.security')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>👆 {t('settings.biometric')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>{t('settings.biometricSub')}</Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{false: colors.gray300, true: colors.primary}}
              thumbColor={colors.white}
            />
          </View>
          <View style={[styles.rowDivider, {borderColor: theme.border}]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>📸 {t('settings.faceRecognition')}</Text>
              <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>{t('settings.faceRecognitionSub')}</Text>
            </View>
            <Text style={[styles.linkText, {color: colors.primary}]}>{'Setup ▸'}</Text>
          </View>
          <View style={[styles.rowDivider, {borderColor: theme.border}]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, {color: theme.text}]}>🔒 {t('settings.changePin')}</Text>
            </View>
            <Text style={[styles.linkText, {color: colors.primary}]}>{'▸'}</Text>
          </View>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('settings.about')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          {aboutRows.map((row, idx, arr) => (
            <View key={row.label}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, {color: theme.text}]}>{row.label}</Text>
                <Text style={[styles.settingSubLabel, {color: theme.textSecondary}]}>{row.value}</Text>
              </View>
              {idx < arr.length - 1 && <View style={[styles.rowDivider, {borderColor: theme.border}]} />}
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.logoutBtn, {borderColor: colors.error + '44', backgroundColor: theme.surface}]}
          onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={[styles.logoutText, {color: colors.error}]}>{t('settings.logout')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  sectionTitle: {fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.xs, textTransform: 'uppercase'},

  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLeft: {flex: 1, gap: 2},
  settingLabel: {fontSize: fontSize.sm, fontWeight: '500'},
  settingSubLabel: {fontSize: fontSize.xs},
  rowDivider: {borderTopWidth: StyleSheet.hairlineWidth},

  langBadge: {paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm},
  langBadgeText: {fontSize: fontSize.sm, fontWeight: '600'},

  linkText: {fontSize: fontSize.sm, fontWeight: '600'},

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  logoutIcon: {fontSize: 18},
  logoutText: {fontSize: fontSize.md, fontWeight: '700'},
});
