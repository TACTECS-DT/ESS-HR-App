import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, radius, colors} from '../../config/theme';

interface Props {
  label?: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: ViewStyle;
}

function toDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
  containerStyle,
}: Props) {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        onChange(toStr(selectedDate));
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  }

  function handleOpen() {
    setTempDate(toDate(value));
    setShow(true);
  }

  function handleIOSDone() {
    onChange(toStr(tempDate));
    setShow(false);
  }

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
        onPress={handleOpen}
        activeOpacity={0.7}>
        <Text style={[styles.valueText, {color: value ? theme.text : theme.textPlaceholder}]}>
          {value || 'YYYY-MM-DD'}
        </Text>
        <Text style={[styles.icon, {color: theme.textSecondary}]}>📅</Text>
      </TouchableOpacity>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {/* Android: native dialog */}
      {show && Platform.OS === 'android' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {/* iOS: bottom-sheet modal with spinner */}
      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, {backgroundColor: theme.surface}]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.modalAction, {color: theme.textSecondary}]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleIOSDone}>
                  <Text style={[styles.modalAction, {color: colors.primary, fontWeight: '700'}]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.spinner}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
  icon: {fontSize: 18},
  error: {fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  modalAction: {fontSize: fontSize.md},
  spinner: {width: '100%'},
});
