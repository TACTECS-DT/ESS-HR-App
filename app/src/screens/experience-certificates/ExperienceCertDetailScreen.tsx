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
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {ExperienceCertificate} from '../../api/mocks/experience-certificates.mock';
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<RequestsStackParamList, 'ExperienceCertDetail'>;

function InfoRow({label, value, theme}: {label: string; value: string; theme: any}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: theme.text}]}>{value}</Text>
    </View>
  );
}

function stepDotColor(status: string): string {
  if (status === 'approved') {return colors.success;}
  if (status === 'refused') {return colors.error;}
  return colors.warning;
}

export default function ExperienceCertDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const {canApproveHRRequests, canRefuseHRRequests, canResetLeave, canDeleteDraftLeave} = useRBAC();
  const isAr = i18n.language === 'ar';
  const {id} = route.params;

  const {data: certs} = useQuery({
    queryKey: ['experience-certs'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.certificates.list);
      return isApiSuccess(res.data) ? (res.data.data as ExperienceCertificate[]) : [];
    },
  });

  const cert = certs?.find(c => c.id === id);

  const canApprove = canApproveHRRequests && cert?.status === 'pending';
  const canRefuse  = canRefuseHRRequests  && cert?.status === 'pending';
  const canReset   = canResetLeave        && cert?.status === 'refused';
  const canDelete  = canDeleteDraftLeave  && cert?.status === 'draft';

  const patchMutation = useMutation({
    mutationFn: async (action: string) => {
      await apiClient.patch(API_MAP.certificates.byId(id), {action});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['experience-certs']});
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function confirmAction(action: string, label: string) {
    Alert.alert(label, `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: label, onPress: () => patchMutation.mutate(action)},
    ]);
  }

  if (!cert) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('expCert.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  const displayTitle = isAr ? cert.title_ar : cert.title;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('expCert.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Main details card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.certTitle, {color: theme.text}]} numberOfLines={2}>
              {displayTitle}
            </Text>
            <StatusChip status={cert.status} label={t(`common.status.${cert.status}`)} />
          </View>
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <InfoRow label={t('common.employee')} value={isAr ? cert.employee_ar : cert.employee} theme={theme} />
          <InfoRow label={t('expCert.directedTo')} value={cert.directed_to} theme={theme} />
          {cert.required_date ? (
            <InfoRow label={t('expCert.requiredDate')} value={cert.required_date} theme={theme} />
          ) : null}
          <InfoRow label={t('common.date')} value={cert.request_date} theme={theme} />
          {cert.purpose ? (
            <>
              <View style={[styles.divider, {borderColor: theme.border}]} />
              <Text style={[styles.purposeLabel, {color: theme.textSecondary}]}>{t('expCert.purpose')}:</Text>
              <Text style={[styles.purposeText, {color: theme.text}]}>
                {isAr ? (cert.purpose_ar ?? cert.purpose) : cert.purpose}
              </Text>
            </>
          ) : null}
        </View>

        {/* Approval Timeline */}
        {cert.approval_history.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('leave.approvalHistory')}</Text>
            <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
              {cert.approval_history.map((step, idx) => {
                const dotColor = stepDotColor(step.status);
                const isLast = idx === cert.approval_history.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, {backgroundColor: dotColor}]} />
                      {!isLast && <View style={[styles.line, {backgroundColor: theme.border}]} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.stepApprover, {color: theme.text}]}>
                        {step.step} — {step.approver}
                      </Text>
                      <StatusChip status={step.status} label={t(`common.status.${step.status}`)} />
                      {step.date ? (
                        <Text style={[styles.stepDate, {color: theme.textSecondary}]}>{step.date}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* HR Actions */}
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

  card: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  certTitle: {fontSize: fontSize.lg, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  divider: {borderTopWidth: StyleSheet.hairlineWidth},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  infoLabel: {fontSize: fontSize.sm},
  infoValue: {fontSize: fontSize.sm, fontWeight: '600'},
  purposeLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  purposeText: {fontSize: fontSize.sm},

  sectionTitle: {fontSize: fontSize.md, fontWeight: '700'},
  timelineItem: {flexDirection: 'row', gap: spacing.sm, minHeight: 48},
  timelineLeft: {alignItems: 'center', width: 16},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 3},
  line: {flex: 1, width: 2, marginTop: 4},
  timelineContent: {flex: 1, gap: 4, paddingBottom: spacing.sm},
  stepApprover: {fontSize: fontSize.sm, fontWeight: '600'},
  stepDate: {fontSize: fontSize.xs},

  actionRow: {flexDirection: 'row', gap: spacing.sm},
  actionBtn: {flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
  actionBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  secondaryBtn: {borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
  secondaryBtnText: {fontSize: fontSize.sm, fontWeight: '700'},
  dangerBtn: {borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center'},
  dangerBtnText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
