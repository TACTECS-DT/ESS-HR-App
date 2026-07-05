import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, radius, colors} from '../../config/theme';

export interface SelectOption {
  label: string;
  value: string | number;
  subtitle?: string;
}

interface Props {
  label?: string;
  options: SelectOption[];
  value: string | number | null;
  onChange: (v: string | number) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function SelectField({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  containerStyle,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, {color: theme.textSecondary}]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: theme.surface,
            borderColor: error ? colors.error : theme.border,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.valueText,
            {color: selected ? theme.text : theme.textPlaceholder},
          ]}
          numberOfLines={1}>
          {selected ? selected.label : (placeholder ?? 'Select...')}
        </Text>
        <Text style={[styles.chevron, {color: theme.textSecondary}]}>▾</Text>
      </TouchableOpacity>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.root}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, {backgroundColor: theme.background}]}>
            <View style={[styles.sheetHeader, {borderBottomColor: theme.border}]}>
              <Text style={[styles.sheetTitle, {color: theme.text}]}>
                {label ?? 'Select'}
              </Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={[styles.closeBtn, {color: theme.textSecondary}]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              bounces={false}
              renderItem={({item}) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      {borderBottomColor: theme.border},
                      isSelected && {backgroundColor: colors.primary + '11'},
                    ]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}>
                    <View style={{flex: 1}}>
                      <Text
                        style={[
                          styles.itemLabel,
                          {
                            color: isSelected ? colors.primary : theme.text,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={[styles.itemSubtitle, {color: theme.textSecondary}]}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={[styles.check, {color: colors.primary}]}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginBottom: spacing.md},
  label: {fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  valueText: {flex: 1, fontSize: fontSize.md},
  chevron: {fontSize: fontSize.lg, marginLeft: spacing.xs},
  error: {fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs},

  root: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {fontSize: fontSize.md, fontWeight: '700'},
  closeBtn: {fontSize: fontSize.md},

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLabel: {fontSize: fontSize.md},
  itemSubtitle: {fontSize: fontSize.xs, marginTop: 2},
  check: {fontSize: fontSize.md, marginLeft: spacing.sm},
});
