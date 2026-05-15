import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useQuery} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import AccessDenied from '../../components/common/AccessDenied';
import {useTheme} from '../../hooks/useTheme';
import {useRBAC} from '../../hooks/useRBAC';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {MoreStackParamList} from '../../navigation/types';
import type {EmployeeListItem} from '../../api/mocks/profile.mock';
import {API_MAP} from '../../api/apiMap';

type Nav = StackNavigationProp<MoreStackParamList>;

const ROLE_COLORS: Record<string, string> = {
  employee: '#636366',
  manager:  colors.primary,
  hr:       '#34C759',
  admin:    '#FF3B30',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export default function EmployeeDirectoryScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const isAr = i18n.language === 'ar';
  const {canViewOtherProfiles} = useRBAC();
  const [search, setSearch] = useState('');

  const {data, isLoading} = useQuery({
    queryKey: ['employees'],
    enabled: canViewOtherProfiles,
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.employee.directory);
      return isApiSuccess(res.data) ? (res.data.data as EmployeeListItem[]) : [];
    },
  });

  const employees = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) {return employees;}
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.name_ar.includes(search) ||
      e.badge_id.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.job_title.toLowerCase().includes(q),
    );
  }, [employees, search]);

  if (!canViewOtherProfiles) {
    return <AccessDenied />;
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('profile.directory', 'Employee Directory')} showBack />

      {/* Search bar */}
      <View style={[styles.searchWrap, {backgroundColor: theme.surface, borderColor: theme.border}]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, {color: theme.text}]}
          placeholder={t('common.search', 'Search...')}
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={[styles.clearBtn, {color: theme.textSecondary}]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => <LoadingSkeleton key={i} height={68} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title={t('common.noData')} />}
          renderItem={({item}) => {
            const name = isAr ? item.name_ar : item.name;
            const jobTitle = isAr ? item.job_title_ar : item.job_title;
            const dept = isAr ? item.department_ar : item.department;
            const roleColor = ROLE_COLORS[item.role] ?? colors.primary;

            return (
              <TouchableOpacity
                style={[styles.row, {backgroundColor: theme.surface, borderColor: theme.border}]}
                onPress={() => navigation.navigate('Profile', {employeeId: item.id, employeeName: item.name})}
                activeOpacity={0.7}>
                {/* Avatar */}
                <View style={[styles.avatar, {backgroundColor: roleColor + '22'}]}>
                  <Text style={[styles.avatarText, {color: roleColor}]}>{getInitials(item.name)}</Text>
                </View>
                {/* Info */}
                <View style={styles.info}>
                  <Text style={[styles.name, {color: theme.text}]}>{name}</Text>
                  <Text style={[styles.sub, {color: theme.textSecondary}]} numberOfLines={1}>
                    {jobTitle} · {dept}
                  </Text>
                </View>
                {/* Badge ID + role pill */}
                <View style={styles.right}>
                  <View style={[styles.rolePill, {backgroundColor: roleColor + '18'}]}>
                    <Text style={[styles.rolePillText, {color: roleColor}]}>{item.role}</Text>
                  </View>
                  <Text style={[styles.badgeId, {color: theme.textSecondary}]}>{item.badge_id}</Text>
                </View>
                <Text style={[styles.arrow, {color: theme.textSecondary}]}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: {fontSize: 16},
  searchInput: {flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.sm},
  clearBtn: {fontSize: 14, paddingHorizontal: spacing.xs},

  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},

  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {fontSize: fontSize.md, fontWeight: '700'},
  info: {flex: 1, gap: 2},
  name: {fontSize: fontSize.sm, fontWeight: '600'},
  sub: {fontSize: fontSize.xs},
  right: {alignItems: 'flex-end', gap: 4},
  rolePill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.round,
  },
  rolePillText: {fontSize: 10, fontWeight: '700', textTransform: 'capitalize'},
  badgeId: {fontSize: fontSize.xs},
  arrow: {fontSize: 20},
});
