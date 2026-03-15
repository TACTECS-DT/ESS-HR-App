import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {AttendanceStackParamList} from './types';

import AttendanceDashboardScreen from '../screens/attendance/AttendanceDashboardScreen';
import AttendanceHistoryScreen from '../screens/attendance/AttendanceHistoryScreen';
import AttendanceDailySheetScreen from '../screens/attendance/AttendanceDailySheetScreen';
import AttendanceMonthlySheetScreen from '../screens/attendance/AttendanceMonthlySheetScreen';

const Stack = createStackNavigator<AttendanceStackParamList>();

export default function AttendanceNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AttendanceDashboard" component={AttendanceDashboardScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Stack.Screen name="AttendanceDailySheet" component={AttendanceDailySheetScreen} />
      <Stack.Screen name="AttendanceMonthlySheet" component={AttendanceMonthlySheetScreen} />
    </Stack.Navigator>
  );
}
