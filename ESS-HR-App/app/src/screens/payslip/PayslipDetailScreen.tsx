import React from 'react';
import {View, Text, StyleSheet, ScrollView, Share, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import StatusChip from '../../components/common/StatusChip';
import {useTheme} from '../../hooks/useTheme';
import {useAppSelector} from '../../hooks/useAppSelector';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Payslip, PayslipLine} from '../../api/mocks/payslip.mock';
import {API_MAP} from '../../api/apiMap';

type Route = RouteProp<RequestsStackParamList, 'PayslipDetail'>;

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function LineRow({line, isAr, theme}: {line: PayslipLine; isAr: boolean; theme: any}) {
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.lineName, {color: theme.text}]}>
        {isAr ? line.name_ar : line.name}
      </Text>
      <Text style={[styles.lineAmount, {color: theme.text}]}>
        {line.amount.toLocaleString()}
      </Text>
    </View>
  );
}

export default function PayslipDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const user = useAppSelector(state => state.auth.user);
  const {id} = route.params;
  const isAr = i18n.language === 'ar';

  const {data: payslips} = useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.payslip.list);
      return isApiSuccess(res.data) ? (res.data.data as Payslip[]) : [];
    },
  });

  const payslip = payslips?.find(p => p.id === id);

  const monthNames = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const monthLabel = payslip ? `${monthNames[payslip.month - 1]} ${payslip.year}` : '';

  async function handleShare() {
    if (!payslip) {return;}
    try {
      await Share.share({
        message: `Payslip ${monthLabel}\nNet: ${payslip.net.toLocaleString()} ${payslip.currency}`,
      });
    } catch {}
  }

  function handleDownload() {
    Alert.alert(t('payslip.download'), 'PDF download coming in Stage 3.');
  }

  if (!payslip) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('payslip.title')} showBack />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader
        title={monthLabel}
        showBack
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.headerIcon}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.headerIcon}>📥</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Net Salary summary card */}
        <View style={[styles.summaryCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.netAmount, {color: colors.success}]}>
            {payslip.net.toLocaleString()} {payslip.currency}
          </Text>
          <Text style={[styles.netLabel, {color: theme.textSecondary}]}>{t('payslip.net')}</Text>
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>{t('common.employee')}</Text>
            <Text style={[styles.summaryValue, {color: theme.text}]}>{isAr ? (user?.name_ar ?? '') : (user?.name ?? '')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>{t('payslip.period')}</Text>
            <Text style={[styles.summaryValue, {color: theme.text}]}>
              {isAr
                ? `١ - ${payslip.month === 2 ? '٢٨' : '٣٠'} ${monthNames[payslip.month - 1]} ${payslip.year}`
                : `${monthNames[payslip.month - 1]} 1 - ${payslip.month === 2 ? 28 : 30}, ${payslip.year}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, {color: theme.textSecondary}]}>{t('common.status.done')}</Text>
            <StatusChip status={payslip.status} label={t(`common.status.${payslip.status}`)} />
          </View>
        </View>

        {/* Earnings card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: colors.success}]}>{t('payslip.earnings')}</Text>
          {payslip.earnings.map(line => (
            <LineRow key={line.code} line={line} isAr={isAr} theme={theme} />
          ))}
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <View style={styles.lineRow}>
            <Text style={[styles.totalLabel, {color: theme.text}]}>{t('payslip.gross')}</Text>
            <Text style={[styles.totalAmount, {color: colors.success}]}>
              {payslip.gross.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Deductions card */}
        <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>
          <Text style={[styles.cardTitle, {color: colors.error}]}>{t('payslip.deductions')}</Text>
          {payslip.deduction_lines.map(line => (
            <LineRow key={line.code} line={line} isAr={isAr} theme={theme} />
          ))}
          <View style={[styles.divider, {borderColor: theme.border}]} />
          <View style={styles.lineRow}>
            <Text style={[styles.totalLabel, {color: theme.text}]}>{t('payslip.deductions')}</Text>
            <Text style={[styles.totalAmount, {color: colors.error}]}>
              -{payslip.deductions.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnPrimary, {backgroundColor: colors.primary}]}
            onPress={handleDownload}>
            <Text style={styles.btnPrimaryText}>📥 {t('payslip.download')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOutline, {borderColor: colors.primary}]}
            onPress={handleShare}>
            <Text style={[styles.btnOutlineText, {color: colors.primary}]}>📤 {t('payslip.share')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},
  headerActions: {flexDirection: 'row', gap: spacing.sm, alignItems: 'center'},
  headerIcon: {fontSize: 18},

  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  netAmount: {fontSize: 28, fontWeight: '700'},
  netLabel: {fontSize: fontSize.sm},

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {fontSize: fontSize.md, fontWeight: '700'},

  divider: {borderTopWidth: StyleSheet.hairlineWidth, marginVertical: spacing.xs},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: spacing.xs,
  },
  summaryLabel: {fontSize: fontSize.sm},
  summaryValue: {fontSize: fontSize.sm, fontWeight: '600'},

  lineRow: {flexDirection: 'row', justifyContent: 'space-between'},
  lineName: {fontSize: fontSize.sm, flex: 1},
  lineAmount: {fontSize: fontSize.sm, fontWeight: '600'},
  totalLabel: {fontSize: fontSize.sm, fontWeight: '700'},
  totalAmount: {fontSize: fontSize.sm, fontWeight: '700'},

  btnRow: {flexDirection: 'row', gap: spacing.sm},
  btnPrimary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnPrimaryText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnOutlineText: {fontSize: fontSize.sm, fontWeight: '700'},
});
