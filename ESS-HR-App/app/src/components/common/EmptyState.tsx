import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Button from './Button';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize} from '../../config/theme';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({title, subtitle, actionLabel, onAction}: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📭</Text>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl},
  icon: {fontSize: 48, marginBottom: spacing.md},
  title: {fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xs},
  subtitle: {fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg},
  btn: {marginTop: spacing.sm},
});
