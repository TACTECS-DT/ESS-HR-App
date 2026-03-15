import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize} from '../../config/theme';

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function ScreenHeader({title, showBack = false, onBack, right}: Props) {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.header,
          borderBottomColor: theme.border,
          paddingTop: insets.top,
        },
      ]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => onBack ? onBack() : navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={{color: theme.text, fontSize: 32, lineHeight: 36}}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {width: 44, alignItems: 'flex-start', justifyContent: 'center'},
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  right: {width: 40, alignItems: 'flex-end'},
});
