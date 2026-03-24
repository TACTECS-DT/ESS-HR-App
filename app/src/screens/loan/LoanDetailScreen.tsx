import React from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import StatusChip from '../../components/common/StatusChip';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Loan} from '../../api/mocks/loan.mock';

type Route = RouteProp<RequestsStackParamList, 'LoanDetail'>;

export default function LoanDetailScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const {canApproveManagerLoan, canApproveHRLoan, canApproveCEOLoan, canRefuseLoan} = useRBAC();
  const {id} = route.params;

  const {data: loans} = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const res = await apiClient.get('/loans');
      return isApiSuccess(res.data) ? (res.data.data as Loan[]) : [];
    },
  });

  const loan = loans?.find(l => l.id === id);

  // 3-level approval chain: Manager → HR → CEO (Admin)
  const canManagerApprove = canApproveManagerLoan && loan?.status === 'pending';
  const canHRApprove      = canApproveHRLoan      && loan?.status === 'manager_approved';
  const canCEOApprove     = canApproveCEOLoan     && loan?.status === 'hr_approved';
  const canApprove        = canManagerApprove || canHRApprove || canCEOApprove;
  const canRefuse         = canRefuseLoan && ['pending', 'manager_approved', 'hr_approved'].includes(loan?.status ?? '');

  const patchMutation = useMutation({
    mutationFn: async (action: string) => {
      await apiClient.patch(`/loans/${id}`, {action});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['loans']});
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function confirmAction(action: string, label: string) {
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: () => patchMutation.mutate(action)},
    ]);
  }

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

  const paidInstallments = loan.installments.filter(i => i.status === 'paid');
  const paidAmount = paidInstallments.reduce((sum, i) => sum + i.amount, 0);
  const remainingAmount = loan.amount - paidAmount;
  const paymentStart = loan.installments[0]?.month ?? '';
  const paymentEnd = loan.installments[loan.installments.length - 1]?.month ?? '';

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('loan.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={{flex: 1}}>
              <Text style={[styles.loanTitle, {color: theme.text}]}>{t('loan.title')}</Text>
              <Text style={[styles.amount, {color: colors.primary}]}>
                {loan.amount.toLocaleString()} {t('common.sar')}
              </Text>
            </View>
            <StatusChip status={loan.status} label={t(`common.status.${loan.status}`)} />
          </View>
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('common.employee')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{loan.employee}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.monthly')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {loan.monthly_installment.toLocaleString()} {t('common.sar')} / {t('loan.month')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.duration')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {loan.duration_months} {t('loan.months')}
            </Text>
          </View>
          {paymentStart ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.paymentStart')}</Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>{paymentStart}</Text>
            </View>
          ) : null}
          {paymentEnd ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.paymentEnd')}</Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>{paymentEnd}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('loan.transferMethod')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{loan.transfer_method}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('common.date')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{loan.request_date}</Text>
          </View>
          {loan.reason ? (
            <>
              <View style={[styles.divider, {borderColor: theme.border}]} />
              <Text style={[styles.reasonLabel, {color: theme.textSecondary}]}>{t('loan.reason')}:</Text>
              <Text style={[styles.reasonText, {color: theme.text}]}>{loan.reason}</Text>
            </>
          ) : null}
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

        {/* Approval Actions — shown per role and loan status */}
        {(canApprove || canRefuse) ? (
          <View style={styles.actionRow}>
            {canManagerApprove ? (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.success}]}
                onPress={() => confirmAction('approve', t('loan.actions.approve'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✓ '}{t('loan.actions.approve')}</Text>
              </TouchableOpacity>
            ) : null}
            {canHRApprove ? (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.success}]}
                onPress={() => confirmAction('hr_approve', t('loan.actions.hrApprove'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✓ '}{t('loan.actions.hrApprove')}</Text>
              </TouchableOpacity>
            ) : null}
            {canCEOApprove ? (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.success}]}
                onPress={() => confirmAction('ceo_approve', t('loan.actions.ceoApprove'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✓ '}{t('loan.actions.ceoApprove')}</Text>
              </TouchableOpacity>
            ) : null}
            {canRefuse ? (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.error}]}
                onPress={() => confirmAction('refuse', t('leave.actions.refuse'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✗ '}{t('leave.actions.refuse')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
              {/* Paid / Remaining summary */}
              <View style={[styles.summaryRow, {borderTopColor: theme.border}]}>
                <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>{t('loan.paid')}</Text>
                <Text style={[styles.summaryValue, {color: colors.success}]}>
                  {paidAmount.toLocaleString()} {t('common.sar')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>{t('loan.remaining')}</Text>
                <Text style={[styles.summaryValue, {color: colors.error}]}>
                  {remainingAmount.toLocaleString()} {t('common.sar')}
                </Text>
              </View>
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
  loanTitle: {fontSize: fontSize.sm, color: '#888'},
  amount: {fontSize: fontSize.xxl, fontWeight: '700'},
  divider: {borderTopWidth: StyleSheet.hairlineWidth},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between'},
  detailLabel: {fontSize: fontSize.sm, flex: 1},
  detailValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, textAlign: 'right'},
  reasonLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  reasonText: {fontSize: fontSize.sm, lineHeight: 20},
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
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs},
  summaryLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  summaryValue: {fontSize: fontSize.sm, fontWeight: '700'},
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  actionBtn: {flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
  actionBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
