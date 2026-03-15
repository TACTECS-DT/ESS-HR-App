import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import {useTheme} from '../../hooks/useTheme';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AttendanceSummary} from '../../api/mocks/attendance.mock';

type DayStatus = 'present' | 'absent' | 'on_leave' | 'holiday' | 'weekend' | 'late' | 'future';

interface DayInfo {
  day: number;
  status: DayStatus;
}

const STATUS_COLORS: Record<DayStatus, string> = {
  present: colors.success,
  absent: colors.error,
  on_leave: colors.warning,
  holiday: '#AF52DE',
  weekend: colors.gray400,
  late: '#FF9F0A',
  future: 'transparent',
};

/** Generate mock calendar data for a given month/year */
function buildCalendar(year: number, month: number): DayInfo[] {
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayInfo[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isFuture = date > today;
    const isWeekend = dow === 5 || dow === 6; // Fri-Sat for MENA

    let status: DayStatus;
    if (isFuture) {
      status = 'future';
    } else if (isWeekend) {
      status = 'weekend';
    } else if (d === 23 || d === 1) {
      status = 'holiday';
    } else if (d === 5 || d === 18) {
      status = 'on_leave';
    } else if (d === 9) {
      status = 'absent';
    } else if (d === 3 || d === 15) {
      status = 'late';
    } else {
      status = 'present';
    }

    days.push({day: d, status});
  }
  return days;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_HEADERS_AR = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];

export default function CalendarScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const {data: summaryData} = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/summary');
      return isApiSuccess(res.data) ? (res.data.data as AttendanceSummary) : null;
    },
  });

  const days = buildCalendar(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const blanks = Array(firstDow).fill(null);

  function prevMonth() {
    if (month === 1) {setYear(y => y - 1); setMonth(12);}
    else {setMonth(m => m - 1);}
  }
  function nextMonth() {
    if (month === 12) {setYear(y => y + 1); setMonth(1);}
    else {setMonth(m => m + 1);}
  }

  const monthName = isAr ? MONTH_NAMES_AR[month - 1] : MONTH_NAMES[month - 1];
  const dayHeaders = isAr ? DAY_HEADERS_AR : DAY_HEADERS;

  // Count stats for this month
  const stats = days.reduce(
    (acc, d) => {
      if (d.status !== 'future' && d.status !== 'weekend' && d.status !== 'holiday') {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const LEGEND: Array<{key: DayStatus; labelKey: string}> = [
    {key: 'present', labelKey: 'calendar.present'},
    {key: 'late', labelKey: 'calendar.late'},
    {key: 'absent', labelKey: 'calendar.absent'},
    {key: 'on_leave', labelKey: 'calendar.onLeave'},
    {key: 'holiday', labelKey: 'calendar.holiday'},
    {key: 'weekend', labelKey: 'calendar.weekend'},
  ];

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('calendar.title')} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Month navigator */}
        <Card style={styles.navCard}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={[styles.navArrow, {color: colors.primary}]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.monthTitle, {color: theme.text}]}>
              {monthName} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={[styles.navArrow, {color: colors.primary}]}>›</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Day headers */}
        <Card style={styles.calCard}>
          <View style={styles.dayHeaderRow}>
            {dayHeaders.map(h => (
              <View key={h} style={styles.cell}>
                <Text style={[styles.dayHeader, {color: theme.textSecondary}]}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {blanks.map((_, i) => <View key={`b${i}`} style={styles.cell} />)}
            {days.map(({day, status}) => {
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() + 1 &&
                year === today.getFullYear();
              const bg = status === 'future' ? 'transparent' : STATUS_COLORS[status];
              return (
                <View key={day} style={styles.cell}>
                  <View
                    style={[
                      styles.dayCircle,
                      {backgroundColor: bg + (status === 'future' ? '' : '33')},
                      isToday && styles.todayRing,
                    ]}>
                    <Text
                      style={[
                        styles.dayNum,
                        {color: status === 'future' ? theme.textSecondary : (STATUS_COLORS[status])},
                        isToday && {fontWeight: '700'},
                      ]}>
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            {key: 'present', label: t('calendar.present'), color: colors.success},
            {key: 'absent', label: t('calendar.absent'), color: colors.error},
            {key: 'on_leave', label: t('calendar.onLeave'), color: colors.warning},
          ].map(s => (
            <Card key={s.key} style={styles.statCard} padded>
              <Text style={[styles.statNum, {color: s.color}]}>{stats[s.key] ?? 0}</Text>
              <Text style={[styles.statLabel, {color: theme.textSecondary}]} numberOfLines={1}>
                {s.label}
              </Text>
            </Card>
          ))}
        </View>

        {/* Legend */}
        <Card style={styles.legendCard}>
          <Text style={[styles.legendTitle, {color: theme.text}]}>{t('calendar.legend')}</Text>
          <View style={styles.legendGrid}>
            {LEGEND.map(({key, labelKey}) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: STATUS_COLORS[key]}]} />
                <Text style={[styles.legendLabel, {color: theme.textSecondary}]}>
                  {t(labelKey)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Hours summary from real attendance data */}
        {summaryData && (
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, {color: theme.text}]}>
              {isAr ? 'ملخص اليوم' : "Today's Summary"}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, {color: colors.primary}]}>
                  {summaryData.hours_worked_today.toFixed(1)}
                </Text>
                <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>
                  {isAr ? 'ساعات اليوم' : 'Hours Today'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, {color: colors.success}]}>
                  {summaryData.hours_worked_this_month.toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>
                  {isAr ? 'ساعات الشهر' : 'Hours Month'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, {color: colors.warning}]}>
                  {summaryData.absences_this_month}
                </Text>
                <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>
                  {isAr ? 'غياب' : 'Absences'}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: spacing.md, gap: spacing.md},
  navCard: {},
  navRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  navBtn: {padding: spacing.sm},
  navArrow: {fontSize: 28, lineHeight: 32},
  monthTitle: {fontSize: fontSize.xl, fontWeight: '700'},
  calCard: {},
  dayHeaderRow: {flexDirection: 'row', marginBottom: spacing.xs},
  cell: {width: `${100 / 7}%`, alignItems: 'center', marginBottom: spacing.xs},
  dayHeader: {fontSize: fontSize.xs, fontWeight: '600'},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  dayCircle: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayNum: {fontSize: fontSize.sm, fontWeight: '500'},
  statsRow: {flexDirection: 'row', gap: spacing.sm},
  statCard: {flex: 1, alignItems: 'center'},
  statNum: {fontSize: fontSize.xxl, fontWeight: '700'},
  statLabel: {fontSize: fontSize.xs, textAlign: 'center', marginTop: 2},
  legendCard: {},
  legendTitle: {fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm},
  legendGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, width: '45%'},
  legendDot: {width: 12, height: 12, borderRadius: 6},
  legendLabel: {fontSize: fontSize.sm},
  summaryCard: {},
  summaryTitle: {fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {alignItems: 'center', gap: 2},
  summaryNum: {fontSize: fontSize.xl, fontWeight: '700'},
  summaryLabel: {fontSize: fontSize.xs, textAlign: 'center'},
});
