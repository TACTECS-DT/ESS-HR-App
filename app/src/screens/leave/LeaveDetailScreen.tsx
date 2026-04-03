import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import StatusChip from '../../components/common/StatusChip';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {LeaveRequest} from '../../api/mocks/leave.mock';
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<RequestsStackParamList, 'LeaveDetail'>;

function InfoRow({label, value, theme}: {label: string; value: string; theme: any}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: theme.text}]}>{value}</Text>
    </View>
  );
}

function stepDotColor(status: string): string {
  if (status === 'approved' || status === 'validated') {return colors.success;}
  if (status === 'refused') {return colors.error;}
  return colors.warning;
}

export default function LeaveDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const {id} = route.params;
  const {canApproveLeave, canRefuseLeave, canResetLeave, canDeleteDraftLeave, canValidateLeave} = useRBAC();

  const [comment, setComment] = useState('');

  const {data: request, isLoading} = useQuery({
    queryKey: ['leave-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.leave.requestById(id));
      return isApiSuccess(res.data) ? (res.data.data as LeaveRequest) : null;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({queryKey: ['leave-detail', id]});
    queryClient.invalidateQueries({queryKey: ['leave-requests']});
    queryClient.invalidateQueries({queryKey: ['leave-balances']});
  }

  const approveMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(API_MAP.leave.approve, {leave_id: id}),
    onSuccess: invalidate,
    onError: () => Alert.alert(t('common.error')),
  });

  const refuseMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(API_MAP.leave.refuse, {leave_id: id, reason: comment}),
    onSuccess: () => { setComment(''); invalidate(); },
    onError: () => Alert.alert(t('common.error')),
  });

  const validateMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(API_MAP.leave.validate, {leave_id: id}),
    onSuccess: invalidate,
    onError: () => Alert.alert(t('common.error')),
  });

  const resetMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(API_MAP.leave.reset, {leave_id: id}),
    onSuccess: invalidate,
    onError: () => Alert.alert(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiClient.delete(API_MAP.leave.requestById(id)),
    onSuccess: invalidate,
    onError: () => Alert.alert(t('common.error')),
  });

  const anyPending =
    approveMutation.isPending ||
    refuseMutation.isPending ||
    validateMutation.isPending ||
    resetMutation.isPending ||
    deleteMutation.isPending;

  function confirmAction(label: string, onConfirm: () => void) {
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: onConfirm},
    ]);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('leave.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => <LoadingSkeleton key={i} height={80} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('leave.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  const leaveTypeName = isAr ? request.leave_type_ar : request.leave_type;
  const modeName = t(`leave.mode.${request.mode}`);
  const isOwnRequest = request.employee_id === user?.id;

  // Action visibility based on status + RBAC
  const canApprove = canApproveLeave && request.status === 'pending';
  const canValidate = canValidateLeave && request.status === 'approved';
  const canRefuse = canRefuseLeave && (
    request.status === 'pending' ||
    (request.status === 'approved' && canValidateLeave)
  );
  const canReset = canResetLeave && request.status === 'refused';
  const canDelete = canDeleteDraftLeave && request.status === 'draft' && isOwnRequest;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('leave.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Leave Details card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.row}>
            <Text style={[styles.typeText, {color: theme.text}]}>{leaveTypeName}</Text>
            <StatusChip status={request.status} label={t(`common.status.${request.status}`)} />
          </View>
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <InfoRow label={t('common.employee')} value={isAr ? request.employee_ar : request.employee} theme={theme} />
          <InfoRow label={t('leave.dateFrom')} value={request.date_from} theme={theme} />
          <InfoRow label={t('leave.dateTo')} value={request.date_to} theme={theme} />
          <InfoRow label={t('leave.duration')} value={`${request.duration} ${t('leave.days')}`} theme={theme} />
          <InfoRow label={t('leave.durationType')} value={modeName} theme={theme} />
          {request.description ? (
            <>
              <View style={[styles.divider, {borderColor: theme.border}]} />
              <Text style={[styles.descLabel, {color: theme.textSecondary}]}>
                {t('leave.description')}{':'}
              </Text>
              <Text style={[styles.descText, {color: theme.text}]}>{request.description}</Text>
            </>
          ) : null}
        </View>

        {/* Approval Timeline */}
        {request.approval_history.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.approvalHistory')}</Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {request.approval_history.map((step, idx) => {
                const dotColor = stepDotColor(step.status);
                const isLast = idx === request.approval_history.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, {backgroundColor: dotColor}]} />
                      {!isLast && <View style={[styles.line, {backgroundColor: theme.border}]} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.stepApprover, {color: theme.text}]}>
                        {isAr ? step.approver_ar : step.approver}
                      </Text>
                      <StatusChip status={step.status} label={t(`common.status.${step.status}`)} />
                      {step.date ? (
                        <Text style={[styles.stepDate, {color: theme.textSecondary}]}>{step.date}</Text>
                      ) : null}
                      {step.note ? (
                        <Text style={[styles.stepNote, {color: theme.textSecondary}]}>{step.note}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Approval Actions */}
        {(canApprove || canValidate || canRefuse) ? (
          <View style={[styles.actionsCard, {backgroundColor: theme.surface, borderColor: colors.primary}]}>
            <Text style={[styles.actionsTitle, {color: theme.text}]}>
              {canValidate ? t('leave.hrActions', 'HR Actions') : t('leave.managerActions')}
            </Text>
            <View style={styles.actionBtns}>
              {canApprove ? (
                <TouchableOpacity
                  style={[styles.actionBtn, {backgroundColor: colors.success}]}
                  onPress={() => confirmAction(t('leave.actions.approve'), () => approveMutation.mutate())}
                  disabled={anyPending}>
                  <Text style={styles.actionBtnText}>{'✓ '}{t('leave.actions.approve')}</Text>
                </TouchableOpacity>
              ) : null}
              {canValidate ? (
                <TouchableOpacity
                  style={[styles.actionBtn, {backgroundColor: colors.primary}]}
                  onPress={() => confirmAction(t('leave.actions.validate'), () => validateMutation.mutate())}
                  disabled={anyPending}>
                  <Text style={styles.actionBtnText}>{'✓✓ '}{t('leave.actions.validate')}</Text>
                </TouchableOpacity>
              ) : null}
              {canRefuse ? (
                <TouchableOpacity
                  style={[styles.actionBtn, {backgroundColor: colors.error}]}
                  onPress={() => confirmAction(t('leave.actions.refuse'), () => refuseMutation.mutate())}
                  disabled={anyPending}>
                  <Text style={styles.actionBtnText}>{'✗ '}{t('leave.actions.refuse')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={[styles.commentInput, {borderColor: theme.border, color: theme.text, backgroundColor: theme.background}]}
              placeholder={t('leave.commentPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={2}
            />
          </View>
        ) : null}

        {canReset ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, {borderColor: colors.primary}]}
            onPress={() => confirmAction(t('leave.actions.resetToDraft'), () => resetMutation.mutate())}
            disabled={anyPending}>
            <Text style={[styles.secondaryBtnText, {color: colors.primary}]}>
              {t('leave.actions.resetToDraft')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {canDelete ? (
          <TouchableOpacity
            style={[styles.dangerBtn, {backgroundColor: colors.error}]}
            onPress={() => confirmAction(t('common.delete'), () => deleteMutation.mutate())}
            disabled={anyPending}>
            <Text style={styles.dangerBtnText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  typeText: {fontSize: fontSize.lg, fontWeight: '700'},
  divider: {borderTopWidth: StyleSheet.hairlineWidth, marginVertical: spacing.xs},

  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  infoLabel: {fontSize: fontSize.sm},
  infoValue: {fontSize: fontSize.sm, fontWeight: '600'},

  descLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  descText: {fontSize: fontSize.sm},

  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},

  timelineItem: {flexDirection: 'row', gap: spacing.sm, minHeight: 48},
  timelineLeft: {alignItems: 'center', width: 16},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 3},
  line: {flex: 1, width: 2, marginTop: 4},
  timelineContent: {flex: 1, gap: 4, paddingBottom: spacing.sm},
  stepApprover: {fontSize: fontSize.sm, fontWeight: '600'},
  stepDate: {fontSize: fontSize.xs},
  stepNote: {fontSize: fontSize.xs, fontStyle: 'italic'},

  actionsCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  actionsTitle: {fontSize: fontSize.sm, fontWeight: '700'},
  actionBtns: {flexDirection: 'row', gap: spacing.sm},
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  commentInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  secondaryBtn: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {fontSize: fontSize.sm, fontWeight: '700'},
  dangerBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
