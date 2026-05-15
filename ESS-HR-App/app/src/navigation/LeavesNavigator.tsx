import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {LeavesStackParamList} from './types';

import LeaveListScreen from '../screens/leave/LeaveListScreen';
import LeaveBalanceScreen from '../screens/leave/LeaveBalanceScreen';
import LeaveCreateScreen from '../screens/leave/LeaveCreateScreen';
import LeaveDetailScreen from '../screens/leave/LeaveDetailScreen';
import LeaveTeamBalanceScreen from '../screens/leave/LeaveTeamBalanceScreen';

const Stack = createStackNavigator<LeavesStackParamList>();

export default function LeavesNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="LeaveList" component={LeaveListScreen} />
      <Stack.Screen name="LeaveBalance" component={LeaveBalanceScreen} />
      <Stack.Screen name="LeaveCreate" component={LeaveCreateScreen} />
      <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} />
      <Stack.Screen name="LeaveTeamBalance" component={LeaveTeamBalanceScreen} />
    </Stack.Navigator>
  );
}
