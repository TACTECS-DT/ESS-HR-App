import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import type {MoreStackParamList} from '../../navigation/types';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {EmployeeProfile} from '../../api/mocks/profile.mock';

function ProfileRow({label, value, theme}: {label: string; value?: string; theme: ReturnType<typeof useTheme>}) {
  if (!value) {return null;}
  return (
    <View style={styles.profileRow}>
      <Text style={[styles.profileLabel, {color: theme.textSecondary}]}>{label}</Text>
      <Text style={[styles.profileValue, {color: theme.text}]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<MoreStackParamList>>();
  const isAr = i18n.language === 'ar';

  const {data: profile, isLoading, refetch} = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get('/profile');
      return isApiSuccess(res.data) ? (res.data.data as EmployeeProfile) : null;
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('profile.title')} showBack onBack={() => navigation.getParent()?.navigate('HomeTab' as never)} />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={120} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('profile.title')} showBack onBack={() => navigation.getParent()?.navigate('HomeTab' as never)} />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('profile.title')} showBack onBack={() => navigation.getParent()?.navigate('HomeTab' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>

        {/* Centered avatar header */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, {backgroundColor: colors.primary + '33'}]}>
            <Text style={[styles.avatarInitial, {color: colors.primary}]}>
              {profile.name.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.profileName, {color: theme.text}]}>
            {isAr ? profile.name_ar : profile.name}
          </Text>
          <Text style={[styles.profileJobTitle, {color: theme.textSecondary}]}>
            {isAr ? profile.job_title_ar : profile.job_title}
          </Text>
          <View style={[styles.badgePill, {backgroundColor: colors.primary + '15'}]}>
            <Text style={[styles.badgePillText, {color: colors.primary}]}>{profile.badge_id}</Text>
          </View>
        </View>

        {/* Personal */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('profile.personal')}</Text>
        <Card style={styles.card}>
          <ProfileRow label={t('profile.name')} value={isAr ? profile.name_ar : profile.name} theme={theme} />
          <ProfileRow label={t('profile.dateOfBirth')} value={profile.date_of_birth} theme={theme} />
          <ProfileRow
            label={t('profile.nationality')}
            value={isAr ? profile.nationality_ar : profile.nationality}
            theme={theme}
          />
          <ProfileRow
            label={t('profile.maritalStatus')}
            value={isAr ? profile.marital_status_ar : profile.marital_status}
            theme={theme}
          />
          <ProfileRow
            label={t('profile.dependents')}
            value={profile.dependents !== undefined ? String(profile.dependents) : undefined}
            theme={theme}
          />
          <ProfileRow label={t('profile.idNumber')} value={profile.id_number} theme={theme} />
        </Card>

        {/* Work */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('profile.work')}</Text>
        <Card style={styles.card}>
          <ProfileRow
            label={t('profile.company')}
            value={isAr ? profile.company_ar : profile.company}
            theme={theme}
          />
          <ProfileRow
            label={t('profile.department')}
            value={isAr ? profile.department_ar : profile.department}
            theme={theme}
          />
          <ProfileRow
            label={t('profile.jobTitle')}
            value={isAr ? profile.job_title_ar : profile.job_title}
            theme={theme}
          />
          <ProfileRow
            label={t('profile.manager')}
            value={isAr ? profile.manager_ar : profile.manager}
            theme={theme}
          />
          <ProfileRow label={t('profile.hireDate')} value={profile.hire_date} theme={theme} />
        </Card>

        {/* Contact */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('profile.contact')}</Text>
        <Card style={styles.card}>
          <ProfileRow label={t('profile.phone')} value={profile.phone} theme={theme} />
          <ProfileRow label={t('profile.email')} value={profile.email} theme={theme} />
          <ProfileRow label={t('profile.badgeId')} value={profile.badge_id} theme={theme} />
        </Card>

        {/* Contract */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t('profile.contract')}</Text>
        <Card style={styles.card}>
          <ProfileRow
            label={t('profile.contractType')}
            value={isAr ? profile.contract_type_ar : profile.contract_type}
            theme={theme}
          />
          {profile.basic_salary !== undefined ? (
            <ProfileRow
              label={t('profile.basicSalary')}
              value={`${profile.basic_salary.toLocaleString()} SAR`}
              theme={theme}
            />
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},

  avatarSection: {alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs},
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarInitial: {fontSize: 32, fontWeight: '700'},
  profileName: {fontSize: fontSize.xl, fontWeight: '700'},
  profileJobTitle: {fontSize: fontSize.sm},
  badgePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.round,
    marginTop: 4,
  },
  badgePillText: {fontSize: fontSize.xs, fontWeight: '700'},

  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  card: {gap: spacing.sm},
  profileRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  profileLabel: {fontSize: fontSize.sm, flex: 1},
  profileValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, textAlign: 'right'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
