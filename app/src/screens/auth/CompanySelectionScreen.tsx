import React from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, I18nManager} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp, RouteProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AuthStackParamList} from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'CompanySelection'>;
type Route = RouteProp<AuthStackParamList, 'CompanySelection'>;

export default function CompanySelectionScreen() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {companies} = route.params;
  const isAr = i18n.language === 'ar';

  function selectCompany(id: number, name: string, name_ar: string) {
    navigation.navigate('Login', {
      companyId: id,
      companyName: isAr ? name_ar : name,
    });
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* ── Back bar (sits below status bar via insets.top) ─────────────── */}
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
});
