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
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {LeaveRequest} from '../../api/mocks/leave.mock';

type Route = RouteProp<RequestsStackParamList, 'LeaveDetail'>;

function InfoRow({label, value, theme}: {label: string; value: string; theme: any}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: theme.text}]}>{value}</Text>
    </View>
  );
}

export default function LeaveDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const isAr = i18n.language === 'ar';
  const {id} = route.params;

  const [comment, setComment] = useState('');

  const {data: requests} = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/leave/requests');
      return isApiSuccess(res.data) ? (res.data.data as LeaveRequest[]) : [];
    },
  });

  const request = requests?.find(r => r.id === id);

  function stepDotColor(status: string): string {
    if (status === 'approved') {return colors.success;}
    if (status === 'refused') {return colors.error;}
    return colors.warning;
  }

  const isManager = user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin';
  const canApprove = isManager && request?.status === 'pending';
  const canReset = request?.status === 'refused';
  const canDelete = request?.status === 'draft';

  const patchMutation = useMutation({
    mutationFn: async (action: string) => {
      await apiClient.patch(`/leave/requests/${id}`, {action, comment});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leave-requests']});
    },
  });

  function confirmAction(action: string, label: string) {
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: () => patchMutation.mutate(action)},
    ]);
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
          <InfoRow label={isAr ? 'من' : 'Date From'} value={request.date_from} theme={theme} />
          <InfoRow label={isAr ? 'إلى' : 'Date To'} value={request.date_to} theme={theme} />
          <InfoRow label={isAr ? 'المدة' : 'Duration'} value={`${request.duration} ${t('leave.days')}`} theme={theme} />
          <InfoRow label={isAr ? 'النوع' : 'Type'} value={modeName} theme={theme} />
          {request.description ? (
            <>
              <View style={[styles.divider, {borderColor: theme.border}]} />
              <Text style={[styles.descLabel, {color: theme.textSecondary}]}>
                {isAr ? 'الوصف:' : 'Description:'}
              </Text>
              <Text style={[styles.descText, {color: theme.text}]}>{request.description}</Text>
            </>
          ) : null}
        </View>

        {/* Approval Timeline */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.approvalHistory')}</Text>
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          {request.approval_history.map((step, idx) => {
            const dotColor = stepDotColor(step.status);
            const isLast = idx === request.approval_history.length - 1;
            return (
              <View key={idx} style={styles.timelineItem}>
                {/* Vertical line + dot */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, {backgroundColor: dotColor}]} />
                  {!isLast && <View style={[styles.line, {backgroundColor: theme.border}]} />}
                </View>
                {/* Content */}
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

        {/* Manager Actions */}
        {canApprove ? (
          <View style={[styles.actionsCard, {backgroundColor: theme.surface, borderColor: colors.primary}]}>
            <Text style={[styles.actionsTitle, {color: theme.text}]}>
              {isAr ? 'إجراء المدير' : 'Manager Actions'}
            </Text>
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.success}]}
                onPress={() => confirmAction('approve', t('leave.actions.approve'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✓ '}{t('leave.actions.approve')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: colors.error}]}
                onPress={() => confirmAction('refuse', t('leave.actions.refuse'))}
                disabled={patchMutation.isPending}>
                <Text style={styles.actionBtnText}>{'✗ '}{t('leave.actions.refuse')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.commentInput, {borderColor: theme.border, color: theme.text, backgroundColor: theme.background}]}
              placeholder={isAr ? 'تعليق (اختياري)...' : 'Comment (optional)...'}
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
            onPress={() => confirmAction('reset', t('leave.actions.resetToDraft'))}
            disabled={patchMutation.isPending}>
            <Text style={[styles.secondaryBtnText, {color: colors.primary}]}>
              {t('leave.actions.resetToDraft')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {canDelete ? (
          <TouchableOpacity
            style={[styles.dangerBtn, {backgroundColor: colors.error}]}
            onPress={() => confirmAction('delete', t('common.delete'))}
            disabled={patchMutation.isPending}>
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
