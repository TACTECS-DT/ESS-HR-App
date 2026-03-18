import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AttendanceRecord, DayStatus, SheetStatus} from '../../api/mocks/attendance.mock';

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_AR = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

function formatHours(h: number): string {
  if (!h) {return '—';}
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : `${hrs}:00`;
}

function statusLabel(status: DayStatus, tFn: (key: string) => string): string {
  switch (status) {
    case 'present': return '✓';
    case 'absent': return tFn('attendance.status.absent');
    case 'weekend': return 'WE';
    case 'public_holiday': return tFn('calendar.holiday');
    case 'on_leave': return tFn('attendance.status.on_leave');
  }
}

function statusColor(status: DayStatus): string {
  switch (status) {
    case 'present': return colors.success;
    case 'absent': return colors.error;
    case 'weekend': return colors.gray400;
    case 'public_holiday': return colors.info ?? colors.primary;
    case 'on_leave': return colors.primary;
  }
}

// sheetStatusLabel moved inline using t('attendance.sheetStatus.*')

export default function AttendanceMonthlySheetScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';

  // Use local state so the user can navigate months
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const {data: history} = useQuery({
    queryKey: ['attendance-history'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/history');
      return isApiSuccess(res.data) ? (res.data.data as AttendanceRecord[]) : [];
    },
  });

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthRecords = (history ?? []).filter(r => r.date.startsWith(prefix));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    const dateStr = `${prefix}-${d}`;
    const record = monthRecords.find(r => r.date === dateStr);
    const dayOfWeek = new Date(dateStr).getDay();
    return {dateStr, dayNum: i + 1, dayOfWeek, record};
  });

  const monthNames = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayNames = isAr ? DAY_NAMES_AR : DAY_NAMES_EN;

  // Derive sheet status from most common record status
  const dominantSheetStatus: SheetStatus = monthRecords.length > 0
    ? (monthRecords[0].sheet_status ?? 'draft')
    : 'draft';

  function buildRowData(record: AttendanceRecord | undefined, dayOfWeek: number, dayNum: number) {
    const dayLabel = `${dayNames[dayOfWeek]} ${dayNum}`;
    const checkIn = record?.check_in ?? '\u2014';
    const checkOut = record?.check_out ?? '\u2014';
    const hours = record?.worked_hours ? formatHours(record.worked_hours) : '\u2014';
    const ds: DayStatus = record?.day_status ?? 'absent';
    return {dayLabel, checkIn, checkOut, hours, ds};
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  }

  const statusChipColor = dominantSheetStatus === 'confirmed'
    ? colors.success
    : dominantSheetStatus === 'done'
    ? colors.primary
    : colors.warning;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={t('attendance.monthlySheet')}
        showBack
        right={
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={[styles.navArrow, {color: colors.white}]}>{'◀'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={[styles.navArrow, {color: colors.white}]}>{'▶'}</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Month header card */}
        <View style={[styles.headerCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.monthTitle, {color: theme.text}]}>
            {monthNames[month - 1]} {year}
          </Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, {color: theme.textSecondary}]}>
              {t('common.statusLabel')}{': '}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: statusChipColor + '22'}]}>
              <Text style={[styles.statusBadgeText, {color: statusChipColor}]}>
                {t(`attendance.sheetStatus.${dominantSheetStatus}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={[styles.table, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          {/* Header row */}
          <View style={[styles.row, styles.headerRow, {backgroundColor: '#f5f7fa'}]}>
            <Text style={[styles.cell, styles.cellDay, styles.headerCell, {color: theme.text}]}>
              {t('attendance.day')}
            </Text>
            <Text style={[styles.cell, styles.cellTime, styles.headerCell, {color: theme.text}]}>
              {t('attendance.in')}
            </Text>
            <Text style={[styles.cell, styles.cellTime, styles.headerCell, {color: theme.text}]}>
              {t('attendance.out')}
            </Text>
            <Text style={[styles.cell, styles.cellHours, styles.headerCell, {color: theme.text}]}>
              {t('attendance.hours')}
            </Text>
            <Text style={[styles.cell, styles.cellStatus, styles.headerCell, {color: theme.text}]}>
              {t('common.statusLabel')}
            </Text>
          </View>

          {/* Data rows */}
          {days.map(({dateStr, dayNum, dayOfWeek, record}, idx) => {
            const bg = idx % 2 === 0 ? theme.surface : theme.background;
            const {dayLabel, checkIn, checkOut, hours, ds} = buildRowData(record, dayOfWeek, dayNum);
            const sc = statusColor(ds);
            const sl = statusLabel(ds, t);

            return (
              <View key={dateStr} style={[styles.row, {backgroundColor: bg}]}>
                <Text style={[styles.cell, styles.cellDay, {color: theme.text}]} numberOfLines={1}>
                  {dayLabel}
                </Text>
                <Text style={[styles.cell, styles.cellTime, {color: theme.textSecondary}]}>
                  {checkIn}
                </Text>
                <Text style={[styles.cell, styles.cellTime, {color: theme.textSecondary}]}>
                  {checkOut}
                </Text>
                <Text style={[styles.cell, styles.cellHours, {color: theme.textSecondary}]}>
                  {hours}
                </Text>
                <Text style={[styles.cell, styles.cellStatus, {color: sc, fontWeight: '700'}]}>
                  {sl}
                </Text>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},

  monthNav: {flexDirection: 'row', gap: spacing.md, alignItems: 'center'},
  navArrow: {fontSize: fontSize.md, fontWeight: '700'},

  headerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  statusRow: {flexDirection: 'row', alignItems: 'center'},
  statusLabel: {fontSize: fontSize.sm},
  statusBadge: {paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.round},
  statusBadgeText: {fontSize: fontSize.xs, fontWeight: '700'},

  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {},
  cell: {
    paddingVertical: 7,
    paddingHorizontal: 4,
    fontSize: 11,
    textAlign: 'center',
  },
  headerCell: {fontWeight: '700', fontSize: 11},
  cellDay: {flex: 2, textAlign: 'left', paddingHorizontal: 8},
  cellTime: {flex: 1.5},
  cellHours: {flex: 1.2},
  cellStatus: {flex: 1.5},
});
