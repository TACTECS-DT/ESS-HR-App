import React from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp, RouteProp} from '@react-navigation/stack';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {AuthStackParamList} from '../../navigation/types';
import {I18nManager} from 'react-native';

type Nav = StackNavigationProp<AuthStackParamList, 'CompanySelection'>;
type Route = RouteProp<AuthStackParamList, 'CompanySelection'>;

export default function CompanySelectionScreen() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
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
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>{t('auth.selectCompany')}</Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {t('auth.selectCompanySubtitle')}
        </Text>
      </View>
      <FlatList
        data={companies}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
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
  header: {padding: spacing.lg, paddingTop: spacing.xxl},
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
