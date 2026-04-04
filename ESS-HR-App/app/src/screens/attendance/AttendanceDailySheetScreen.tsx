import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import StatusChip from '../../components/common/StatusChip';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors} from '../../config/theme';
import type {AttendanceStackParamList} from '../../navigation/types';
import type {AttendanceRecord} from '../../api/mocks/attendance.mock';
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<AttendanceStackParamList, 'AttendanceDailySheet'>;

export default function AttendanceDailySheetScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const {date} = route.params;

  const {data: history} = useQuery({
    queryKey: ['attendance-history'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.attendance.history);
      return isApiSuccess(res.data) ? (res.data.data as AttendanceRecord[]) : [];
    },
  });

  const record = history?.find(r => r.date === date);

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('attendance.dailySheet')} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, {color: theme.text}]}>{date}</Text>

        {record ? (
          <>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={[styles.label, {color: theme.textSecondary}]}>
                  {t('attendance.checkIn')}
                </Text>
                <Text style={[styles.value, {color: theme.text}]}>
                  {record.check_in ?? '--:--'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: theme.textSecondary}]}>
                  {t('attendance.checkOut')}
                </Text>
                <Text style={[styles.value, {color: theme.text}]}>
                  {record.check_out ?? '--:--'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: theme.textSecondary}]}>
                  {t('attendance.workedHours')}
                </Text>
                <Text style={[styles.value, {color: colors.primary, fontWeight: '700'}]}>
                  {record.worked_hours.toFixed(2)}h
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: theme.textSecondary}]}>
                  {t('common.status.draft')}
                </Text>
                <StatusChip
                  status={record.sheet_status}
                  label={t(`attendance.sheetStatus.${record.sheet_status}`)}
                />
              </View>
            </Card>

            {record.location_in ? (
              <Card style={styles.card}>
                <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
                  📍 {t('attendance.location')}
                </Text>
                <Text style={[styles.value, {color: theme.text}]}>
                  {t('attendance.checkIn')}: {record.location_in.lat.toFixed(4)},{' '}
                  {record.location_in.lng.toFixed(4)}
                </Text>
              </Card>
            ) : null}
          </>
        ) : (
          <Card style={styles.card}>
            <Text style={[styles.value, {color: theme.textSecondary}]}>
              {t('common.noData')}
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md},
  date: {fontSize: fontSize.xl, fontWeight: '700'},
  card: {gap: spacing.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  label: {fontSize: fontSize.sm},
  value: {fontSize: fontSize.md},
  sectionLabel: {fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs},
});
