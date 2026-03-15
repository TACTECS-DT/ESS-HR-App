import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {statusColor} from '../../config/theme';
import {radius, fontSize, spacing} from '../../config/theme';

interface Props {
  status: string;
  label: string;
}

export default function StatusChip({status, label}: Props) {
  const color = statusColor(status);
  return (
    <View style={[styles.chip, {backgroundColor: color + '22', borderColor: color}]}>
      <Text style={[styles.text, {color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
