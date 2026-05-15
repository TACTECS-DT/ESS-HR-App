import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import TextInput from '../../components/common/TextInput';
import DatePickerField from '../../components/common/DatePickerField';
import SelectField from '../../components/common/SelectField';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LeaveType, LeaveBalance} from '../../api/mocks/leave.mock';
import {API_MAP} from '../../api/apiMap';

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcWorkingDays(from: string, to: string): number {
  if (!from || !to) {return 0;}
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {return 0;}
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 5 && d !== 6) {count++;} // skip Fri + Sat (MENA weekend)
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Parse "HH:MM" string → float hours (e.g. "08:30" → 8.5).
 * Returns null if the format is invalid.
 */
function parseTimeToFloat(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {return null;}
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) {return null;}
  return h + min / 60;
}

/** Clamp float hours and format as "HH:MM". */
function floatToTime(f: number): string {
  const h = Math.floor(Math.max(0, Math.min(23, f)));
  const min = Math.round((f - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function LeaveCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const user = useAppSelector(state => state.auth.user);
  const {showError, showValidationError} = useApiError();

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');

  // half_day state
  const [amPm, setAmPm] = useState<'am' | 'pm'>('am');

  // hourly state — stored as "HH:MM" strings for display
  const [hourFrom, setHourFrom] = useState('08:00');
  const [hourTo, setHourTo] = useState('09:00');

  // ── fetch leave types & balances ──────────────────────────────────────────

  const {data: types} = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.types);
      return isApiSuccess(res.data) ? (res.data.data as LeaveType[]) : [];
    },
  });

  const {data: balances} = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.balances);
      return isApiSuccess(res.data) ? (res.data.data as LeaveBalance[]) : [];
    },
  });

  // ── derived state ─────────────────────────────────────────────────────────

  const selectedType = types?.find(tp => tp.id === selectedTypeId);
  const selectedBalance = balances?.find(b => b.leave_type_id === selectedTypeId);

  /**
   * The mode is entirely driven by the leave type's request_unit — same as Odoo.
   * The user has no free choice; selecting the type locks the mode.
   *   request_unit='day'      → 'full_day'
   *   request_unit='half_day' → 'half_day_am' | 'half_day_pm'  (user picks AM/PM)
   *   request_unit='hour'     → 'hourly'
   */
  const requestUnit = selectedType?.request_unit ?? 'day';
  const isHalfDay = requestUnit === 'half_day';
  const isHourly = requestUnit === 'hour';
  const isFullDay = !isHalfDay && !isHourly;

  // When the leave type changes reset dates so stale values don't confuse the user.
  useEffect(() => {
    setDateFrom('');
    setDateTo('');
    setAmPm('am');
    setHourFrom('08:00');
    setHourTo('09:00');
  }, [selectedTypeId]);

  // ── mode label ────────────────────────────────────────────────────────────

  const modeLabelKey =
    isHalfDay ? 'leave.mode.half_day' :
    isHourly  ? 'leave.mode.hourly'   :
                'leave.mode.full_day';

  // ── balance / deduction card ──────────────────────────────────────────────

  const daysDeducted = useMemo(() => {
    if (isHalfDay) {return 0.5;}
    if (isHourly)  {return 0;}          // hours shown separately
    return calcWorkingDays(dateFrom, dateTo);
  }, [isHalfDay, isHourly, dateFrom, dateTo]);

  const remainingAfter = selectedBalance
    ? Math.max(0, selectedBalance.remaining - daysDeducted)
    : null;

  const showCalcCard = !!selectedTypeId && (dateFrom || isHalfDay || isHourly);

  // ── leave type selector options ───────────────────────────────────────────

  const leaveTypeOptions = useMemo(() =>
    (types ?? []).map(tp => {
      const bal = balances?.find(b => b.leave_type_id === tp.id);
      return {
        label: isAr ? tp.name_ar : tp.name,
        value: tp.id,
        subtitle: bal
          ? (bal.remaining > 0 ? `${bal.remaining} ${t('leave.days')}` : t('leave.noLimit'))
          : undefined,
      };
    }),
  [types, balances, isAr, t]);

  // ── submit ────────────────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        leave_type_id: selectedTypeId,
        date_from: dateFrom,
        description,
        submit: true,
      };

      if (isHalfDay) {
        body.mode = amPm === 'am' ? 'half_day_am' : 'half_day_pm';
        body.date_to = dateFrom;
      } else if (isHourly) {
        body.mode = 'hourly';
        body.date_to = dateFrom;
        const hf = parseTimeToFloat(hourFrom);
        const ht = parseTimeToFloat(hourTo);
        if (hf !== null) {body.hour_from = hf;}
        if (ht !== null) {body.hour_to = ht;}
      } else {
        body.mode = 'full_day';
        body.date_to = dateTo;
      }

      const res = await apiClient.post(API_MAP.leave.requests, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leave-requests']});
      queryClient.invalidateQueries({queryKey: ['leave-balances']});
      Alert.alert(t('common.done'), t('leave.request') + ' ✓');
      navigation.goBack();
    },
    onError: (err: unknown) => showError(err),
  });

  function handleSubmit() {
    if (!selectedTypeId || !dateFrom) {
      showValidationError('Please fill all required fields');
      return;
    }
    if (isFullDay && !dateTo) {
      showValidationError('Please select an end date');
      return;
    }
    if (isHourly) {
      if (parseTimeToFloat(hourFrom) === null || parseTimeToFloat(hourTo) === null) {
        showValidationError('Please enter valid times (HH:MM)');
        return;
      }
    }
    submitMutation.mutate();
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('leave.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Employee (readonly) */}
        <TextInput
          label={t('common.employee')}
          value={isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}
          onChangeText={() => {}}
          editable={false}
        />

        {/* Leave type selector */}
        <SelectField
          label={`${t('leave.leaveType')} *`}
          options={leaveTypeOptions}
          value={selectedTypeId}
          onChange={v => setSelectedTypeId(v as number)}
          placeholder={t('leave.leaveType')}
        />

        {/* Mode badge — shown once a type is selected, not user-editable */}
        {selectedType ? (
          <View style={[styles.modeBadge, {backgroundColor: colors.primary + '18'}]}>
            <Text style={[styles.modeBadgeText, {color: colors.primary}]}>
              {t(modeLabelKey)}
            </Text>
          </View>
        ) : null}

        {/* ── FULL DAY: date range ── */}
        {isFullDay ? (
          <>
            <DatePickerField
              label={`${t('leave.dateFrom')} *`}
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DatePickerField
              label={`${t('leave.dateTo')} *`}
              value={dateTo}
              onChange={setDateTo}
              minimumDate={dateFrom ? new Date(dateFrom) : undefined}
            />
          </>
        ) : null}

        {/* ── HALF DAY: single date + AM/PM toggle ── */}
        {isHalfDay ? (
          <>
            <DatePickerField
              label={`${t('leave.date')} *`}
              value={dateFrom}
              onChange={setDateFrom}
            />
            <View>
              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {t('leave.period')}
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    {borderColor: theme.border, backgroundColor: theme.surface},
                    amPm === 'am' && {borderColor: colors.primary, backgroundColor: colors.primary + '18'},
                  ]}
                  onPress={() => setAmPm('am')}
                  activeOpacity={0.7}>
                  <Text style={[
                    styles.toggleBtnText,
                    {color: theme.textSecondary},
                    amPm === 'am' && {color: colors.primary, fontWeight: '700'},
                  ]}>
                    {t('leave.morning')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    {borderColor: theme.border, backgroundColor: theme.surface},
                    amPm === 'pm' && {borderColor: colors.primary, backgroundColor: colors.primary + '18'},
                  ]}
                  onPress={() => setAmPm('pm')}
                  activeOpacity={0.7}>
                  <Text style={[
                    styles.toggleBtnText,
                    {color: theme.textSecondary},
                    amPm === 'pm' && {color: colors.primary, fontWeight: '700'},
                  ]}>
                    {t('leave.afternoon')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}

        {/* ── HOURLY: single date + from/to time ── */}
        {isHourly ? (
          <>
            <DatePickerField
              label={`${t('leave.date')} *`}
              value={dateFrom}
              onChange={setDateFrom}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TextInput
                  label={`${t('leave.timeFrom')} *`}
                  placeholder="08:00"
                  value={hourFrom}
                  onChangeText={setHourFrom}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.timeField}>
                <TextInput
                  label={`${t('leave.timeTo')} *`}
                  placeholder="09:00"
                  value={hourTo}
                  onChangeText={setHourTo}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={[styles.hint, {color: theme.textSecondary}]}>
              {t('leave.timeFormatHint', {defaultValue: 'Format: HH:MM (e.g. 08:30)'})}
            </Text>
          </>
        ) : null}

        {/* Calculation info card */}
        {showCalcCard && (isHalfDay || isHourly || daysDeducted > 0) ? (
          <View style={[styles.calcCard, {backgroundColor: colors.primary + '11'}]}>
            {isHourly ? (
              <Text style={[styles.calcMain, {color: colors.primary}]}>
                🕐 {`${floatToTime(parseTimeToFloat(hourFrom) ?? 0)} → ${floatToTime(parseTimeToFloat(hourTo) ?? 0)}`}
              </Text>
            ) : (
              <Text style={[styles.calcMain, {color: colors.primary}]}>
                📅 {t('leave.daysDeducted', {n: daysDeducted})}
              </Text>
            )}
            {!isHourly && remainingAfter !== null ? (
              <Text style={[styles.calcSub, {color: theme.textSecondary}]}>
                {t('leave.remainingAfter', {n: remainingAfter})}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        <TextInput
          label={selectedType?.requires_description
            ? `${t('leave.description')} *`
            : t('leave.description')}
          placeholder="..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Attachment upload zone */}
        {selectedType?.requires_attachment ? (
          <View>
            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
              {t('leave.attachment')} 📎 *
            </Text>
            <TouchableOpacity
              style={[styles.uploadZone, {borderColor: theme.border}]}
              activeOpacity={0.7}>
              <Text style={styles.uploadIcon}>📁</Text>
              <Text style={[styles.uploadText, {color: theme.textSecondary}]}>
                {t('leave.uploadFile')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnOutline, {borderColor: theme.border}]}
            onPress={() => navigation.goBack()}
            disabled={submitMutation.isPending}>
            <Text style={[styles.btnOutlineText, {color: theme.textSecondary}]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              {backgroundColor: colors.primary},
              submitMutation.isPending && {opacity: 0.6},
            ]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}>
            <Text style={styles.btnPrimaryText}>{t('leave.submitRequest')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {padding: spacing.md, gap: spacing.sm},
  fieldLabel: {fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs},
  hint: {fontSize: fontSize.xs, marginTop: -spacing.xs},

  modeBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modeBadgeText: {fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase'},

  // AM / PM toggle
  toggleRow: {flexDirection: 'row', gap: spacing.sm},
  toggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleBtnText: {fontSize: fontSize.sm},

  // Hourly time inputs
  timeRow: {flexDirection: 'row', gap: spacing.sm},
  timeField: {flex: 1},

  // Calculation card
  calcCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  calcMain: {fontSize: fontSize.sm, fontWeight: '600'},
  calcSub: {fontSize: fontSize.xs},

  // Attachment zone
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadIcon: {fontSize: 28},
  uploadText: {fontSize: fontSize.sm},

  // Buttons
  btnRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnOutlineText: {fontSize: fontSize.sm, fontWeight: '700'},
  btnPrimary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnPrimaryText: {color: colors.white, fontSize: fontSize.sm, fontWeight: '700'},
});
