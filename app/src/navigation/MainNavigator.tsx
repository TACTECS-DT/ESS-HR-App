import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import {MainTabParamList} from './types';
import {useTheme} from '../hooks/useTheme';
import {useAppSelector} from '../hooks/useAppSelector';

import HomeNavigator from './HomeNavigator';
import AttendanceNavigator from './AttendanceNavigator';
import LeavesNavigator from './LeavesNavigator';
import PayslipNavigator from './PayslipNavigator';
import MoreNavigator from './MoreNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({emoji, focused}: {emoji: string; focused: boolean}) {
  return (
    <Text style={{fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55}}>
      {emoji}
    </Text>
  );
}

export default function MainNavigator() {
  const theme = useTheme();
  const {t} = useTranslation();
  const allowedModules = useAppSelector(s => s.auth.allowedModules ?? []);

  // Empty allowedModules list means all modules are permitted (no restrictions set).
  function isAllowed(code: string): boolean {
    if (allowedModules.length === 0) {return true;}
    return allowedModules.some(m => m.code === code);
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '500'},
      }}>
      {/* Home is always visible */}
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: t('home.title'),
          tabBarIcon: ({focused}) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />

      {isAllowed('attendance') && (
        <Tab.Screen
          name="AttendanceTab"
          component={AttendanceNavigator}
          options={{
            tabBarLabel: t('attendance.title'),
            tabBarIcon: ({focused}) => <TabIcon emoji="⏰" focused={focused} />,
          }}
        />
      )}

      {isAllowed('leave') && (
        <Tab.Screen
          name="LeavesTab"
          component={LeavesNavigator}
          options={{
            tabBarLabel: t('leave.title'),
            tabBarIcon: ({focused}) => <TabIcon emoji="🏖" focused={focused} />,
          }}
        />
      )}

      {isAllowed('payslip') && (
        <Tab.Screen
          name="PayslipTab"
          component={PayslipNavigator}
          options={{
            tabBarLabel: t('payslip.title'),
            tabBarIcon: ({focused}) => <TabIcon emoji="💰" focused={focused} />,
          }}
        />
      )}

      {/* More tab is always mounted but hidden from the tab bar — accessed via MoreHub */}
      <Tab.Screen
        name="MoreTab"
        component={MoreNavigator}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: {display: 'none', width: 0},
        }}
      />
    </Tab.Navigator>
  );
}
