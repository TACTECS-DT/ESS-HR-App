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
import type {RequestsStackParamList} from '../../navigation/types';
import type {Loan} from '../../api/mocks/loan.mock';

type Route = RouteProp<RequestsStackParamList, 'LoanDetail'>;

export default function LoanDetailScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const {id} = route.params;

  const {data: loans} = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const res = await apiClient.get('/loans');
      return isApiSuccess(res.data) ? (res.data.data as Loan[]) : [];
    },
  });

  const loan = loans?.find(l => l.id === id);

  if (!loan) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('loan.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('loan.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.amount, {color: theme.text}]}>
              {loan.amount.toLocaleString()} SAR
            </Text>
            <StatusChip status={loan.status} label={t(`common.status.${loan.status}`)} />
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.duration')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {loan.duration_months} {t('loan.months')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.monthly')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {loan.monthly_installment.toLocaleString()} SAR
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.transferMethod')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{loan.transfer_method}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('common.date')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{loan.request_date}</Text>
          </View>
        </Card>

        {loan.approval_history.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('leave.approvalHistory')}
            </Text>
            <Card style={styles.card}>
              {loan.approval_history.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor:
                          step.status === 'approved'
                            ? colors.success
                            : step.status === 'refused'
                            ? colors.error
                            : colors.warning,
                      },
                    ]}
                  />
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepApprover, {color: theme.text}]}>
                      {step.step} — {step.approver}
                    </Text>
                    <StatusChip status={step.status} label={t(`common.status.${step.status}`)} />
                    {step.date ? (
                      <Text style={[styles.stepDate, {color: theme.textSecondary}]}>{step.date}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {loan.installments.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              {t('loan.installments')}
            </Text>
            <Card style={styles.card}>
              <View style={[styles.tableHeader, {borderBottomColor: theme.border}]}>
                <Text style={[styles.tableHeaderCell, {color: theme.textSecondary, flex: 2}]}>
                  {t('loan.month')}
                </Text>
                <Text style={[styles.tableHeaderCell, {color: theme.textSecondary, flex: 2}]}>
                  {t('loan.amount')}
                </Text>
                <Text style={[styles.tableHeaderCell, {color: theme.textSecondary, flex: 1}]}>
                  {t('common.status.pending')}
                </Text>
              </View>
              {loan.installments.map((inst, idx) => {
                const isPaid = inst.status === 'paid';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.tableRow,
                      {borderBottomColor: theme.border},
                      isPaid && {backgroundColor: colors.success + '11'},
                    ]}>
                    <Text style={[styles.tableCell, {color: theme.text, flex: 2}]}>{inst.month}</Text>
                    <Text style={[styles.tableCell, {color: theme.text, flex: 2}]}>
                      {inst.amount.toLocaleString()}
                    </Text>
                    <View style={{flex: 1}}>
                      <StatusChip
                        status={inst.status}
                        label={t(`common.status.${inst.status}`)}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md},
  card: {gap: spacing.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  amount: {fontSize: fontSize.xl, fontWeight: '700'},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between'},
  detailLabel: {fontSize: fontSize.sm, flex: 1},
  detailValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, textAlign: 'right'},
  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  stepRow: {flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start'},
  stepDot: {width: 10, height: 10, borderRadius: 5, marginTop: 4},
  stepInfo: {flex: 1, gap: spacing.xs},
  stepApprover: {fontSize: fontSize.sm, fontWeight: '600'},
  stepDate: {fontSize: fontSize.xs},
  tableHeader: {flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1},
  tableHeaderCell: {fontSize: fontSize.xs, fontWeight: '600'},
  tableRow: {flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center'},
  tableCell: {fontSize: fontSize.sm},
});
