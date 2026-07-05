/**
 * AccessDenied — shown when a role attempts to access a restricted screen.
 * Includes a "Go Back" button so the user isn't stranded.
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';

interface Props {
  /** Override the default message */
  message?: string;
}

export default function AccessDenied({message}: Props) {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={[styles.title, {color: theme.text}]}>
        {t('common.accessDenied', 'Access Denied')}
      </Text>
      <Text style={[styles.message, {color: theme.textSecondary}]}>
        {message ?? t('common.accessDeniedMessage', 'You do not have permission to view this screen.')}
      </Text>
      {navigation.canGoBack() ? (
        <TouchableOpacity
          style={[styles.btn, {backgroundColor: colors.primary}]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{t('common.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon:    {fontSize: 48},
  title:   {fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center'},
  message: {fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20},
  btn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  btnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
