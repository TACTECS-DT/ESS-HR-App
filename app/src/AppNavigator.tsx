/**
 * AppNavigator connects Redux auth state to the navigation tree.
 * - If authenticated → show Main tabs
 * - Otherwise → show Auth stack (License → Company → Login)
 *
 * Also renders the persistent offline banner and mini timer bar.
 */
import React from 'react';
import {View, StatusBar} from 'react-native';

import RootNavigator from './navigation/RootNavigator';
import OfflineBanner from './components/common/OfflineBanner';
import TimerBar from './components/common/TimerBar';
import {useAppSelector} from './hooks/useAppSelector';
import {useTheme} from './hooks/useTheme';

export default function AppNavigator() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const language = useAppSelector(state => state.settings.language);
  const theme = useTheme();
  const isDark = theme.isDark;

  return (
    <View style={{flex: 1, backgroundColor: theme.background, direction: language === 'ar' ? 'rtl' : 'ltr'}}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <OfflineBanner />
      <RootNavigator isAuthenticated={isAuthenticated} />
      <TimerBar />
    </View>
  );
}
