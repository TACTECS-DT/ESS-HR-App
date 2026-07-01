import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp, RouteProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {clearAuth} from '../../store/slices/authSlice';

import apiClient from '../../api/client';
import type {MoreStackParamList} from '../../navigation/types';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import AccessDenied from '../../components/common/AccessDenied';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {EmployeeProfile} from '../../api/types/profile';
import {API_MAP} from '../../api/apiMap';
import {avatarUri} from '../../utils/avatarUri';

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
  const route = useRoute<RouteProp<MoreStackParamList, 'Profile'>>();
  const isAr = i18n.language === 'ar';

  const {canViewOtherProfiles, role} = useRBAC();
  const dispatch = useAppDispatch();

  const employeeId = route.params?.employeeId;
  const employeeName = route.params?.employeeName;
  const isViewingOther = !!employeeId;
  const accessAllowed = !isViewingOther || canViewOtherProfiles;

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

  const [avatarError,    setAvatarError]    = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const {data: profile, isLoading, refetch} = useQuery({
    queryKey: ['profile', employeeId ?? 'me'],
    enabled: accessAllowed,
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.employee.profile, {params: employeeId ? {employee_id: employeeId} : undefined});
      return isApiSuccess(res.data) ? (res.data.data as EmployeeProfile) : null;
    },
  });

  // Block access to other employees' profiles for employee and manager roles
  if (!accessAllowed) {
    return <AccessDenied />;
  }

  const headerTitle = isViewingOther
    ? (employeeName ?? t('profile.title'))
    : t('profile.title');
  const handleBack = isViewingOther
    ? () => navigation.goBack()
    : () => navigation.getParent()?.navigate('HomeTab' as never);

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={headerTitle} showBack onBack={handleBack} />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={120} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={headerTitle} showBack onBack={handleBack} />
        <View style={styles.center}>
          <Text style={{color: theme.textSecondary}}>{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={headerTitle} showBack onBack={handleBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>

        {/* Centered avatar header */}
        <View style={styles.avatarSection}>
          {avatarUri(profile.avatar) && !avatarError ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setShowFullImage(true)}>
              <Image
                source={{uri: avatarUri(profile.avatar)}}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.avatarCircle, {backgroundColor: colors.primary + '22'}]}>
              <Text style={[styles.avatarInitial, {color: colors.primary}]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Full-screen avatar viewer */}
          <Modal
            visible={showFullImage}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowFullImage(false)}>
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
            <View style={styles.fullscreenOverlay}>
              <Image
                source={{uri: avatarUri(profile.avatar)!}}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.fullscreenClose}
                onPress={() => setShowFullImage(false)}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <Text style={styles.fullscreenCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          <Text style={[styles.profileName, {color: theme.text}]}>
            {isAr ? profile.name_ar : profile.name}
          </Text>
          <Text style={[styles.profileJobTitle, {color: theme.textSecondary}]}>
            {isAr ? profile.job_title_ar : profile.job_title}
          </Text>
          <View style={[styles.badgePill, {backgroundColor: colors.primary + '15'}]}>
            <Text style={[styles.badgePillText, {color: colors.primary}]}>{profile.badge_id}</Text>
          </View>
          {!isViewingOther && roleLabel ? (
            <Text style={[styles.roleLabel, {color: theme.textSecondary}]}>{'· '}{roleLabel}</Text>
          ) : null}
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

        {/* Logout — own profile only */}
        {!isViewingOther && (
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.8}
            onPress={() => dispatch(clearAuth())}>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl},

  avatarSection: {alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs},

  // Real photo
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.xs,
    borderWidth: 3,
    borderColor: colors.primary + '40',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
    overflow: 'hidden',      // clip to circle on Android
    backgroundColor: colors.gray200,
  },

  // Initials fallback
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },

  avatarInitial: {fontSize: 38, fontWeight: '700'},

  // Full-screen image viewer
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width:  Dimensions.get('window').width,
    height: Dimensions.get('window').width,  // square crop area; resizeMode=contain adapts
  },
  fullscreenClose: {
    position:        'absolute',
    top:             52,
    right:           20,
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  fullscreenCloseText: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '700',
  },
  profileName: {fontSize: fontSize.xl, fontWeight: '700'},
  profileJobTitle: {fontSize: fontSize.sm},
  badgePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.round,
    marginTop: 4,
  },
  badgePillText: {fontSize: fontSize.xs, fontWeight: '700'},
  roleLabel: {fontSize: fontSize.xs, marginTop: 2},

  sectionTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  card: {gap: spacing.sm},
  profileRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  profileLabel: {fontSize: fontSize.sm, flex: 1},
  profileValue: {fontSize: fontSize.sm, fontWeight: '600', flex: 1, textAlign: 'right'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  logoutBtn: {
    marginTop:       spacing.sm,
    marginBottom:    spacing.lg,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.error + '60',
    backgroundColor: colors.error + '10',
    alignItems:      'center',
  },
  logoutText: {
    color:      colors.error,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
});
