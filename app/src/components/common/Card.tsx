import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../hooks/useTheme';
import {spacing, radius} from '../../config/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export default function Card({children, style, padded = true}: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
        padded && styles.padded,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  padded: {padding: spacing.md},
});
