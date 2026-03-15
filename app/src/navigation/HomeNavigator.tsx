import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeStackParamList} from './types';
import HomeScreen from '../screens/home/HomeScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import AnnouncementsScreen from '../screens/home/AnnouncementsScreen';
import CalendarScreen from '../screens/home/CalendarScreen';
import PendingApprovalsScreen from '../screens/home/PendingApprovalsScreen';

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
    </Stack.Navigator>
  );
}
