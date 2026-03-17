import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import {MainTabParamList} from './types';
import {useTheme} from '../hooks/useTheme';

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
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: t('home.title'),
          tabBarIcon: ({focused}) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceNavigator}
        options={{
          tabBarLabel: t('attendance.title'),
          tabBarIcon: ({focused}) => <TabIcon emoji="⏰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LeavesTab"
        component={LeavesNavigator}
        options={{
          tabBarLabel: t('leave.title'),
          tabBarIcon: ({focused}) => <TabIcon emoji="🏖" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PayslipTab"
        component={PayslipNavigator}
        options={{
          tabBarLabel: t('payslip.title'),
          tabBarIcon: ({focused}) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
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
