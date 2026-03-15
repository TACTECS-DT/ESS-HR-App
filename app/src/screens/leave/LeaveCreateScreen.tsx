import React, {useMemo, useState} from 'react';
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
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {LeaveType, LeaveBalance, LeaveMode} from '../../api/mocks/leave.mock';

type SegmentMode = 'full_day' | 'half_day' | 'hourly';

const SEGMENTS: {key: SegmentMode; labelKey: string}[] = [
  {key: 'full_day', labelKey: 'leave.mode.full_day'},
  {key: 'half_day', labelKey: 'leave.mode.half_day_am'},
  {key: 'hourly', labelKey: 'leave.mode.hourly'},
];

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

export default function LeaveCreateScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [segment, setSegment] = useState<SegmentMode>('full_day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');

  const {data: types} = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/types');
      return isApiSuccess(res.data) ? (res.data.data as LeaveType[]) : [];
    },
  });

  const {data: balances} = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/balances');
      return isApiSuccess(res.data) ? (res.data.data as LeaveBalance[]) : [];
    },
  });

  const selectedType = types?.find(tp => tp.id === selectedTypeId);
  const selectedBalance = balances?.find(b => b.leave_type_id === selectedTypeId);

  const leaveMode: LeaveMode =
    segment === 'half_day' ? 'half_day_am' :
    segment === 'hourly' ? 'hourly' : 'full_day';

  const daysDeducted = useMemo(() => {
    if (segment === 'half_day') {return 0.5;}
    if (segment === 'hourly') {return 0;}
    return calcWorkingDays(dateFrom, dateTo);
  }, [segment, dateFrom, dateTo]);

  const remainingAfter = selectedBalance
    ? Math.max(0, selectedBalance.remaining - daysDeducted)
    : null;

  const showCalcCard = selectedTypeId && (dateFrom || segment !== 'full_day');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/leave/requests', {
        leave_type_id: selectedTypeId,
        mode: leaveMode,
        date_from: dateFrom,
        date_to: dateTo,
        description,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leave-requests']});
      queryClient.invalidateQueries({queryKey: ['leave-balances']});
      Alert.alert(t('common.done'), t('leave.request') + ' ✓');
      navigation.goBack();
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function handleSubmit() {
    if (!selectedTypeId || !dateFrom || !dateTo) {
      Alert.alert(t('common.error'), 'Please fill all required fields');
      return;
    }
    mutation.mutate();
  }

  function handleSaveDraft() {
    Alert.alert(t('common.done'), t('leave.saveDraft') + ' ✓');
    navigation.goBack();
  }

  const isHourly = segment === 'hourly';
  const isFullDay = segment === 'full_day';

  // visible mode segments based on selected leave type
  const visibleSegments = SEGMENTS.filter(s => {
    if (s.key === 'full_day') {return true;}
    if (s.key === 'half_day' && selectedType?.allows_half_day) {return true;}
    if (s.key === 'hourly' && selectedType?.allows_hourly) {return true;}
    return !selectedType; // show all if no type selected yet
  });

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('leave.request')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Leave type selector */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('leave.leaveType')} *
        </Text>
        <View style={styles.typeGrid}>
          {(types ?? []).map(tp => {
            const bal = balances?.find(b => b.leave_type_id === tp.id);
            const isSelected = selectedTypeId === tp.id;
            return (
              <TouchableOpacity
                key={tp.id}
                style={[
                  styles.typeChip,
                  {borderColor: isSelected ? colors.primary : theme.border},
                  isSelected && {backgroundColor: colors.primary + '22'},
                ]}
                onPress={() => setSelectedTypeId(tp.id)}>
                <Text style={{color: isSelected ? colors.primary : theme.text, fontSize: fontSize.sm, fontWeight: '600'}}>
                  {isAr ? tp.name_ar : tp.name}
                </Text>
                {bal ? (
                  <Text style={{color: isSelected ? colors.primary : theme.textSecondary, fontSize: 10}}>
                    {bal.remaining > 0 ? `${bal.remaining} ${t('leave.days')}` : t('leave.noLimit')}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration type — segmented control */}
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {t('leave.durationType')}
        </Text>
        <View style={[styles.segmented, {backgroundColor: theme.border}]}>
          {visibleSegments.map((s, idx) => {
            const isActive = segment === s.key;
            const isFirst = idx === 0;
            const isLast = idx === visibleSegments.length - 1;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.segment,
                  isActive && {backgroundColor: colors.primary},
                  !isFirst && {borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.background},
                  isFirst && {borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md},
                  isLast && {borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md},
                ]}
                onPress={() => setSegment(s.key)}>
                <Text style={{
                  color: isActive ? colors.white : theme.textSecondary,
                  fontSize: fontSize.xs,
                  fontWeight: '600',
                }}>
                  {t(s.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dates */}
        {!isHourly ? (
          <>
            <TextInput
              label={`${t('leave.dateFrom')} *`}
              placeholder="YYYY-MM-DD"
              value={dateFrom}
              onChangeText={setDateFrom}
            />
            {isFullDay ? (
              <TextInput
                label={`${t('leave.dateTo')} *`}
                placeholder="YYYY-MM-DD"
                value={dateTo}
                onChangeText={setDateTo}
              />
            ) : null}
          </>
        ) : (
          <TextInput
            label={`${t('leave.dateFrom')} *`}
            placeholder="YYYY-MM-DD"
            value={dateFrom}
            onChangeText={setDateFrom}
          />
        )}

        {/* Calculation info card */}
        {showCalcCard && daysDeducted > 0 ? (
          <View style={[styles.calcCard, {backgroundColor: colors.primary + '11'}]}>
            <Text style={[styles.calcMain, {color: colors.primary}]}>
              📅 {t('leave.daysDeducted', {n: daysDeducted})}
            </Text>
            {remainingAfter !== null ? (
              <Text style={[styles.calcSub, {color: theme.textSecondary}]}>
                {t('leave.remainingAfter', {n: remainingAfter})}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        <TextInput
          label={selectedType?.requires_description ? `${t('leave.description')} *` : t('leave.description')}
          placeholder="..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Attachment upload zone */}
        {selectedType?.requires_attachment ? (
          <View>
            <Text style={[styles.label, {color: theme.textSecondary}]}>
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

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnOutline, {borderColor: colors.primary}]}
            onPress={handleSaveDraft}>
            <Text style={[styles.btnOutlineText, {color: colors.primary}]}>
              {t('leave.saveDraft')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrimary, {backgroundColor: colors.primary}, mutation.isPending && {opacity: 0.6}]}
            onPress={handleSubmit}
            disabled={mutation.isPending}>
            <Text style={styles.btnPrimaryText}>{t('leave.submitRequest')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {padding: spacing.md, gap: spacing.sm},
  label: {fontSize: fontSize.sm, fontWeight: '600'},

  typeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },

  calcCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  calcMain: {fontSize: fontSize.sm, fontWeight: '600'},
  calcSub: {fontSize: fontSize.xs},

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
