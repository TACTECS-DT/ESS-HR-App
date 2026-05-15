import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {RequestsStackParamList} from './types';

import RequestsHubScreen from '../screens/RequestsHubScreen';
// Leave
import LeaveListScreen from '../screens/leave/LeaveListScreen';
import LeaveCreateScreen from '../screens/leave/LeaveCreateScreen';
import LeaveDetailScreen from '../screens/leave/LeaveDetailScreen';
import LeaveTeamBalanceScreen from '../screens/leave/LeaveTeamBalanceScreen';
// Payslip
import PayslipListScreen from '../screens/payslip/PayslipListScreen';
import PayslipDetailScreen from '../screens/payslip/PayslipDetailScreen';
// Expense
import ExpenseListScreen from '../screens/expense/ExpenseListScreen';
import ExpenseCreateScreen from '../screens/expense/ExpenseCreateScreen';
import ExpenseDetailScreen from '../screens/expense/ExpenseDetailScreen';
// Loan
import LoanListScreen from '../screens/loan/LoanListScreen';
import LoanCreateScreen from '../screens/loan/LoanCreateScreen';
import LoanDetailScreen from '../screens/loan/LoanDetailScreen';
// Advance Salary
import AdvanceSalaryListScreen from '../screens/advance-salary/AdvanceSalaryListScreen';
import AdvanceSalaryCreateScreen from '../screens/advance-salary/AdvanceSalaryCreateScreen';
import AdvanceSalaryDetailScreen from '../screens/advance-salary/AdvanceSalaryDetailScreen';
// HR Letters
import HRLetterListScreen from '../screens/hr-letters/HRLetterListScreen';
import HRLetterCreateScreen from '../screens/hr-letters/HRLetterCreateScreen';
import HRLetterDetailScreen from '../screens/hr-letters/HRLetterDetailScreen';
// Document Requests
import DocumentRequestListScreen from '../screens/document-requests/DocumentRequestListScreen';
import DocumentRequestCreateScreen from '../screens/document-requests/DocumentRequestCreateScreen';
import DocumentRequestDetailScreen from '../screens/document-requests/DocumentRequestDetailScreen';
// Experience Certificates
import ExperienceCertListScreen from '../screens/experience-certificates/ExperienceCertListScreen';
import ExperienceCertCreateScreen from '../screens/experience-certificates/ExperienceCertCreateScreen';
import ExperienceCertDetailScreen from '../screens/experience-certificates/ExperienceCertDetailScreen';
// Business Services
import BusinessServiceListScreen from '../screens/business-services/BusinessServiceListScreen';
import BusinessServiceCreateScreen from '../screens/business-services/BusinessServiceCreateScreen';
import BusinessServiceDetailScreen from '../screens/business-services/BusinessServiceDetailScreen';

const Stack = createStackNavigator<RequestsStackParamList>();

export default function RequestsNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="RequestsHub" component={RequestsHubScreen} />
      {/* Leave */}
      <Stack.Screen name="LeaveList" component={LeaveListScreen} />
      <Stack.Screen name="LeaveCreate" component={LeaveCreateScreen} />
      <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} />
      <Stack.Screen name="LeaveTeamBalance" component={LeaveTeamBalanceScreen} />
      {/* Payslip */}
      <Stack.Screen name="PayslipList" component={PayslipListScreen} />
      <Stack.Screen name="PayslipDetail" component={PayslipDetailScreen} />
      {/* Expense */}
      <Stack.Screen name="ExpenseList" component={ExpenseListScreen} />
      <Stack.Screen name="ExpenseCreate" component={ExpenseCreateScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      {/* Loan */}
      <Stack.Screen name="LoanList" component={LoanListScreen} />
      <Stack.Screen name="LoanCreate" component={LoanCreateScreen} />
      <Stack.Screen name="LoanDetail" component={LoanDetailScreen} />
      {/* Advance Salary */}
      <Stack.Screen name="AdvanceSalaryList" component={AdvanceSalaryListScreen} />
      <Stack.Screen name="AdvanceSalaryCreate" component={AdvanceSalaryCreateScreen} />
      <Stack.Screen name="AdvanceSalaryDetail" component={AdvanceSalaryDetailScreen} />
      {/* HR Letters */}
      <Stack.Screen name="HRLetterList" component={HRLetterListScreen} />
      <Stack.Screen name="HRLetterCreate" component={HRLetterCreateScreen} />
      <Stack.Screen name="HRLetterDetail" component={HRLetterDetailScreen} />
      {/* Document Requests */}
      <Stack.Screen name="DocumentRequestList" component={DocumentRequestListScreen} />
      <Stack.Screen name="DocumentRequestCreate" component={DocumentRequestCreateScreen} />
      <Stack.Screen name="DocumentRequestDetail" component={DocumentRequestDetailScreen} />
      {/* Experience Certificates */}
      <Stack.Screen name="ExperienceCertList" component={ExperienceCertListScreen} />
      <Stack.Screen name="ExperienceCertCreate" component={ExperienceCertCreateScreen} />
      <Stack.Screen name="ExperienceCertDetail" component={ExperienceCertDetailScreen} />
      {/* Business Services */}
      <Stack.Screen name="BusinessServiceList" component={BusinessServiceListScreen} />
      <Stack.Screen name="BusinessServiceCreate" component={BusinessServiceCreateScreen} />
      <Stack.Screen name="BusinessServiceDetail" component={BusinessServiceDetailScreen} />
    </Stack.Navigator>
  );
}
