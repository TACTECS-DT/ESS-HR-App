import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthStackParamList} from './types';

import LicenseActivationScreen from '../screens/auth/LicenseActivationScreen';
import CompanySelectionScreen from '../screens/auth/CompanySelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PasswordResetScreen from '../screens/auth/PasswordResetScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="LicenseActivation">
      <Stack.Screen name="LicenseActivation" component={LicenseActivationScreen} />
      <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </Stack.Navigator>
  );
}
