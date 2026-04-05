import React from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import StatusChip from '../../components/common/StatusChip';
import Button from '../../components/common/Button';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useRBAC} from '../../hooks/useRBAC';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Expense} from '../../api/mocks/expense.mock';
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<RequestsStackParamList, 'ExpenseDetail'>;

function InfoRow({label, value, valueColor, theme}: {label: string; value: string; valueColor?: string; theme: any}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: valueColor ?? theme.text}]}>{value}</Text>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const {canApproveExpense, canRefuseExpense, canDeleteDraftLeave} = useRBAC();
  const isAr = i18n.language === 'ar';
  const {id} = route.params;

  const {showError} = useApiError();

  const {data: expenses} = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.expense.expenses);
      return isApiSuccess(res.data) ? (res.data.data as Expense[]) : [];
    },
  });

  const expense = expenses?.find(e => e.id === id);
  const isDraft    = expense?.status === 'draft';
  const canApprove = canApproveExpense && expense?.status === 'submitted';
  const canRefuse  = canRefuseExpense  && expense?.status === 'submitted';
  const canDelete  = canDeleteDraftLeave && isDraft;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(API_MAP.expense.byId(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['expenses']});
      Alert.alert(t('common.done'), t('common.delete') + ' ✓');
    },
    onError: (err) => showError(err),
  });

  const patchMutation = useMutation({
    mutationFn: async (action: string) => {
      await apiClient.patch(API_MAP.expense.byId(id), {action});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['expenses']});
    },
    onError: (err) => showError(err),
  });

  function confirmDelete() {
    Alert.alert(t('common.delete'), `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate()},
    ]);
  }

  function confirmAction(action: string, label: string) {
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: () => patchMutation.mutate(action)},
    ]);
  }

  if (!expense) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('expense.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  const total = expense.amount + expense.tax_amount;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('expense.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Main details card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.expenseName, {color: theme.text}]} numberOfLines={2}>
              {expense.name}
            </Text>
            <StatusChip status={expense.status} label={t(`common.status.${expense.status}`)} />
          </View>
          <View style={[styles.divider, {borderColor: theme.border}]} />

          <InfoRow label={t('common.employee')} value={isAr ? expense.employee_ar : expense.employee} theme={theme} />
          <InfoRow label={t('common.date')} value={expense.date} theme={theme} />
          <InfoRow
            label={t('expense.category')}
            value={isAr ? expense.category_ar : expense.category}
            theme={theme}
          />

          <View style={[styles.divider, {borderColor: theme.border}]} />

          <InfoRow
            label={t('expense.amount')}
            value={`${expense.amount.toLocaleString()} ${expense.currency}`}
            valueColor={colors.primary}
            theme={theme}
          />
          {expense.tax_amount > 0 ? (
            <InfoRow
              label={t('expense.tax')}
              value={`${expense.tax_amount.toLocaleString()} ${expense.currency}`}
              theme={theme}
            />
          ) : null}
          <InfoRow
            label={t('expense.total')}
            value={`${total.toLocaleString()} ${expense.currency}`}
            valueColor={theme.text}
            theme={theme}
          />
          <InfoRow
            label={t('expense.paymentMode.label')}
            value={t(`expense.mode.${expense.payment_mode}`)}
            theme={theme}
          />
          <InfoRow label={t('expense.currency')} value={expense.currency} theme={theme} />

          {expense.description ? (
            <>
              <View style={[styles.divider, {borderColor: theme.border}]} />
              <Text style={[styles.notesLabel, {color: theme.textSecondary}]}>{t('expense.notes')}:</Text>
              <Text style={[styles.notesText, {color: theme.text}]}>{expense.description}</Text>
            </>
          ) : null}
        </View>

        {/* Receipt section */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          {'📎 '}{t('expense.receipt')}
        </Text>
        {expense.attachments.length > 0 ? (
          <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            {expense.attachments.map((att, idx) => (
              <TouchableOpacity key={idx} style={[styles.receiptRow, {backgroundColor: theme.background, borderColor: theme.border}]}>
                <Text style={{fontSize: 28}}>🧾</Text>
                <View style={{flex: 1}}>
                  <Text style={[styles.receiptName, {color: theme.text}]} numberOfLines={1}>{att}</Text>
                  <Text style={[styles.receiptTap, {color: colors.primary}]}>
                    {t('expense.tapToView')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.receiptEmpty, {backgroundColor: theme.surface, borderColor: theme.border}]}>
            <Text style={{fontSize: 36}}>🧾</Text>
            <Text style={[{color: theme.textSecondary, fontSize: fontSize.sm}]}>{t('expense.addReceipt')}</Text>
          </View>
        )}

        {/* Approval timeline if not draft */}
        {!isDraft ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.approvalHistory')}</Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {/* Submitted step — always shown */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, {backgroundColor: colors.success}]} />
                  <View style={[styles.line, {backgroundColor: theme.border}]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.stepText, {color: theme.text}]}>Submitted</Text>
                  <StatusChip status="approved" label={t('common.done')} />
                  <Text style={[styles.stepDate, {color: theme.textSecondary}]}>{expense.date}</Text>
                </View>
              </View>
              {/* Report Created — shown when a report was auto-generated */}
              {expense.expense_report_id ? (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, {backgroundColor: colors.success}]} />
                    <View style={[styles.line, {backgroundColor: theme.border}]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.stepText, {color: theme.text}]}>{t('expense.reportCreated')}</Text>
                    <StatusChip status="approved" label={t('common.done')} />
                    <Text style={[styles.stepDate, {color: theme.textSecondary}]}>Auto-generated</Text>
                  </View>
                </View>
              ) : null}
              {/* Manager Review */}
              {['submitted', 'approved', 'posted'].includes(expense.status) ? (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, {
                      backgroundColor: expense.status === 'approved' || expense.status === 'posted'
                        ? colors.success
                        : colors.warning,
                    }]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.stepText, {color: theme.text}]}>Manager Review</Text>
                    <StatusChip
                      status={expense.status === 'approved' || expense.status === 'posted' ? 'approved' : 'pending'}
                      label={expense.status === 'approved' || expense.status === 'posted'
                        ? t('common.status.approved')
                        : t('common.status.pending')}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Manager / HR approve-refuse */}
        {(canApprove || canRefuse) ? (
          <View style={styles.actionRow}>
            {canApprove ? (
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.success}]}
                onPress={() => confirmAction('approve', t('leave.actions.approve'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✓ '}{t('leave.actions.approve')}</Text>
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

        {canDelete ? (
          <Button
            label={t('common.delete')}
            variant="danger"
            onPress={confirmDelete}
            loading={deleteMutation.isPending}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  card: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  expenseName: {fontSize: fontSize.lg, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  divider: {borderTopWidth: StyleSheet.hairlineWidth},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  infoLabel: {fontSize: fontSize.sm},
  infoValue: {fontSize: fontSize.sm, fontWeight: '600'},
  notesLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  notesText: {fontSize: fontSize.sm, lineHeight: 20},
  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  receiptRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  receiptName: {fontSize: fontSize.sm, fontWeight: '600'},
  receiptTap: {fontSize: fontSize.xs, marginTop: 2},
  receiptEmpty: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineItem: {flexDirection: 'row', gap: spacing.sm, minHeight: 48},
  timelineLeft: {alignItems: 'center', width: 16},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 3},
  line: {flex: 1, width: 2, marginTop: 4},
  timelineContent: {flex: 1, gap: 4, paddingBottom: spacing.sm},
  stepText: {fontSize: fontSize.sm, fontWeight: '600'},
  stepDate: {fontSize: fontSize.xs},
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  actionBtn: {flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
  actionBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
