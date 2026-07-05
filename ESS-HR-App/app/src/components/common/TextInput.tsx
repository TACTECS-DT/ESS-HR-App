import React, {useState} from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, radius, colors} from '../../config/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  secureToggle?: boolean;
}

export default function TextInput({
  label,
  error,
  containerStyle,
  secureToggle,
  secureTextEntry,
  ...rest
}: Props) {
  const theme = useTheme();
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, {color: theme.textSecondary}]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: error ? colors.error : theme.border,
          },
        ]}>
        <RNTextInput
          {...rest}
          secureTextEntry={secure}
          style={[styles.input, {color: theme.text}]}
          placeholderTextColor={theme.textPlaceholder}
        />
        {secureToggle ? (
          <TouchableOpacity onPress={() => setSecure(p => !p)} style={styles.eyeBtn}>
            <Text style={{color: theme.textSecondary}}>{secure ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginBottom: spacing.md},
  label: {fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm},
  eyeBtn: {padding: spacing.xs},
  error: {fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs},
});
