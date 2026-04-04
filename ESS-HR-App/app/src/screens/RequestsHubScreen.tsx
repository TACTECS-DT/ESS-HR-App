import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import {useTheme} from '../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../config/theme';
import type {RequestsStackParamList} from '../navigation/types';

type Nav = StackNavigationProp<RequestsStackParamList>;

const MODULES = [
  {icon: '🏖', titleKey: 'leave.title', route: 'LeaveList'},
  {icon: '💰', titleKey: 'payslip.title', route: 'PayslipList'},
  {icon: '🧾', titleKey: 'expense.title', route: 'ExpenseList'},
  {icon: '🏦', titleKey: 'loan.title', route: 'LoanList'},
  {icon: '💵', titleKey: 'advanceSalary.title', route: 'AdvanceSalaryList'},
  {icon: '📄', titleKey: 'hrLetters.title', route: 'HRLetterList'},
  {icon: '📋', titleKey: 'documentRequests.title', route: 'DocumentRequestList'},
  {icon: '🎓', titleKey: 'experienceCertificates.title', route: 'ExperienceCertList'},
  {icon: '🔧', titleKey: 'businessServices.title', route: 'BusinessServiceList'},
] as const;

export default function RequestsHubScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={[styles.header, {backgroundColor: theme.surface, borderBottomColor: theme.border}]}>
        <Text style={[styles.title, {color: theme.text}]}>{t('home.services')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {MODULES.map(mod => (
          <TouchableOpacity
            key={mod.route}
            style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => navigation.navigate(mod.route as keyof RequestsStackParamList)}>
            <Text style={styles.icon}>{mod.icon}</Text>
            <Text style={[styles.label, {color: theme.text}]} numberOfLines={2}>
              {t(mod.titleKey)}
            </Text>
            <Text style={{color: theme.textSecondary, fontSize: 18}}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    paddingTop: 56,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {fontSize: fontSize.xl, fontWeight: '700'},
  grid: {padding: spacing.md, gap: spacing.sm},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  icon: {fontSize: 28},
  label: {flex: 1, fontSize: fontSize.md, fontWeight: '600'},
});
