import React from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import StatusChip from '../../components/common/StatusChip';
import Button from '../../components/common/Button';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize} from '../../config/theme';
import type {RequestsStackParamList} from '../../navigation/types';
import type {Expense} from '../../api/mocks/expense.mock';

type Route = RouteProp<RequestsStackParamList, 'ExpenseDetail'>;

export default function ExpenseDetailScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const {id} = route.params;

  const {data: expenses} = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses');
      return isApiSuccess(res.data) ? (res.data.data as Expense[]) : [];
    },
  });

  const expense = expenses?.find(e => e.id === id);
  const isDraft = expense?.status === 'draft';

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['expenses']});
      Alert.alert(t('common.done'), t('common.delete') + ' ✓');
    },
    onError: () => Alert.alert(t('common.error')),
  });

  function confirmDelete() {
    Alert.alert(t('common.delete'), `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate()},
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

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('expense.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.title, {color: theme.text}]}>{expense.name}</Text>
            <StatusChip status={expense.status} label={t(`common.status.${expense.status}`)} />
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('expense.category')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {isAr ? expense.category_ar : expense.category}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('expense.amount')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {expense.amount} {expense.currency}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('expense.paymentMode')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {t(`expense.mode.${expense.payment_mode}`)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('common.date')}</Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>{expense.date}</Text>
          </View>
          {expense.description ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{t('expense.description')}</Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>{expense.description}</Text>
            </View>
          ) : null}
        </Card>

        {isDraft ? (
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
  content: {padding: spacing.md, gap: spacing.md},
  card: {gap: spacing.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  title: {fontSize: fontSize.lg, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  detailLabel: {fontSize: fontSize.sm, flex: 1},
  detailValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, textAlign: 'right'},
});
