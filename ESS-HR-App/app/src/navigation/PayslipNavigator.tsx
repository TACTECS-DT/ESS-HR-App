import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {PayslipStackParamList} from './types';

import PayslipListScreen from '../screens/payslip/PayslipListScreen';
import PayslipDetailScreen from '../screens/payslip/PayslipDetailScreen';

const Stack = createStackNavigator<PayslipStackParamList>();

export default function PayslipNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="PayslipList" component={PayslipListScreen} />
      <Stack.Screen name="PayslipDetail" component={PayslipDetailScreen} />
    </Stack.Navigator>
  );
}
