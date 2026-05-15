import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {MoreStackParamList} from './types';

import MoreHubScreen from '../screens/more/MoreHubScreen';
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
import HRLetterListScreen from '../screens/hr-letters/HrLetterListScreen';
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
// Tasks & Timesheets — disabled (work with res.users, not hr.employee — re-enable later)
// import TaskListScreen from '../screens/tasks/TaskListScreen';
// import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
// import LogTimeScreen from '../screens/tasks/LogTimeScreen';
// import AddAttachmentScreen from '../screens/tasks/AddAttachmentScreen';
// import TimesheetDailyScreen from '../screens/tasks/TimesheetDailyScreen';
// import TimesheetWeeklyScreen from '../screens/tasks/TimesheetWeeklyScreen';
// import TimerScreen from '../screens/tasks/TimerScreen';
// import TeamHoursScreen from '../screens/tasks/TeamHoursScreen';
// Personal & Analytics
import PersonalNotesScreen from '../screens/more/PersonalNotesScreen';
import AnalyticsScreen from '../screens/more/AnalyticsScreen';
// Profile & Settings
import ProfileScreen from '../screens/profile/ProfileScreen';
import EmployeeDirectoryScreen from '../screens/profile/EmployeeDirectoryScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
// Chat
import ChatHRScreen from '../screens/more/ChatHRScreen';

const Stack = createStackNavigator<MoreStackParamList>();

export default function MoreNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MoreHub" component={MoreHubScreen} />
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
      {/* Tasks & Timesheets — disabled (re-enable with imports above when ready) */}
      {/* <Stack.Screen name="TaskList" component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="LogTime" component={LogTimeScreen} />
      <Stack.Screen name="AddAttachment" component={AddAttachmentScreen} />
      <Stack.Screen name="TimesheetDaily" component={TimesheetDailyScreen} />
      <Stack.Screen name="TimesheetWeekly" component={TimesheetWeeklyScreen} />
      <Stack.Screen name="Timer" component={TimerScreen} />
      <Stack.Screen name="TeamHours" component={TeamHoursScreen} /> */}
      {/* Personal & Analytics */}
      <Stack.Screen name="PersonalNotes" component={PersonalNotesScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      {/* Profile & Settings */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {/* Chat */}
      <Stack.Screen name="ChatHR" component={ChatHRScreen} />
    </Stack.Navigator>
  );
}
