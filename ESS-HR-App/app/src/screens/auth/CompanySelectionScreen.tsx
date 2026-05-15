import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, I18nManager, ActivityIndicator} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import apiClient from '../../api/client';
import {useAppSelector} from '../../hooks/useAppSelector';
import {API_MAP} from '../../api/apiMap';
import type {AuthStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'CompanySelection'>;

interface Company {
  id: number;
  name: string;
  name_ar: string;
}

export default function CompanySelectionScreen() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language === 'ar';

  const serverUrl = useAppSelector(s => s.auth.serverUrl);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serverUrl) {
      setError(t('common.errorGeneric', 'An error occurred. Please try again.'));
      setLoading(false);
      return;
    }
    // Uses apiClient so mock adapter intercepts this in MOCK_MODE.
    // baseURL is set by the request interceptor from auth.serverUrl.
    apiClient
      .get<{data: Company[]}>(API_MAP.auth.companies, {timeout: 15000})
      .then(res => {
        const list = res.data?.data ?? res.data;
        setCompanies(Array.isArray(list) ? list : []);
      })
      .catch(() => setError(t('auth.errors.serverUnreachable.body')))
      .finally(() => setLoading(false));
  }, [serverUrl, t]);

  function selectCompany(id: number, name: string, name_ar: string) {
    navigation.navigate('Login', {
      companyId: id,
      companyName: isAr ? name_ar : name,
    });
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* ── Back bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, {paddingTop: insets.top + spacing.sm, borderBottomColor: theme.border}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backArrow, {color: colors.primary}]}>
            {I18nManager.isRTL ? '›' : '‹'}
          </Text>
          <Text style={[styles.backLabel, {color: colors.primary}]}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, {backgroundColor: colors.primary}]} />
          <View style={[styles.stepDot, {backgroundColor: colors.primary}]} />
          <View style={[styles.stepDot, {backgroundColor: theme.border}]} />
        </View>
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>{t('auth.selectCompany')}</Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {t('auth.selectCompanySubtitle')}
        </Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, {color: colors.error}]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setError(null);
            setLoading(true);
            apiClient
              .get<{data: Company[]}>(API_MAP.auth.companies, {timeout: 15000})
              .then(res => {
                const list = res.data?.data ?? res.data;
                setCompanies(Array.isArray(list) ? list : []);
              })
              .catch(() => setError(t('auth.errors.serverUnreachable.body')))
              .finally(() => setLoading(false));
          }}>
            <Text style={[styles.retryLabel, {color: colors.primary}]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={companies}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing.lg}]}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[styles.item, {backgroundColor: theme.surface, borderColor: theme.border}]}
              onPress={() => selectCompany(item.id, item.name, item.name_ar)}>
              <View style={styles.itemIcon}>
                <Text style={styles.itemIconText}>🏢</Text>
              </View>
              <Text style={[styles.itemName, {color: theme.text}]}>
                {isAr ? item.name_ar : item.name}
              </Text>
              <Text style={{color: theme.textSecondary, fontSize: 20}}>
                {I18nManager.isRTL ? '‹' : '›'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  backArrow: {fontSize: 22, fontWeight: '600', lineHeight: 26},
  backLabel: {fontSize: fontSize.md, fontWeight: '500'},
  stepRow: {flexDirection: 'row', gap: 6},
  stepDot: {width: 8, height: 8, borderRadius: 4},
  header: {padding: spacing.lg, paddingTop: spacing.md},
  title: {fontSize: fontSize.xxl, fontWeight: '700', marginBottom: spacing.xs},
  subtitle: {fontSize: fontSize.md},
  list: {padding: spacing.lg, gap: spacing.sm},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconText: {fontSize: 22},
  itemName: {flex: 1, fontSize: fontSize.md, fontWeight: '600'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md},
  errorText: {fontSize: fontSize.md, textAlign: 'center', paddingHorizontal: spacing.xl},
  retryBtn: {paddingVertical: spacing.sm, paddingHorizontal: spacing.lg},
  retryLabel: {fontSize: fontSize.md, fontWeight: '600'},
});
